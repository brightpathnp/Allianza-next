'use client';

import { useState, useEffect } from 'react';
import { FileText, CheckCircle2, Loader2, Send, Building2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../../lib/firebase';
import { doc, updateDoc, serverTimestamp, collection, addDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

interface ContractCardProps {
  requestId?: string;
  universityId: string;
  contractStatus?: 'none' | 'signed' | 'submitted' | 'finalized';
  agencyName?: string;
  agencyAddress?: string;
  representativeName?: string;
  position?: string;
  role: 'agent' | 'institution';
}

export default function ContractCard({ 
  requestId, 
  universityId, 
  contractStatus = 'none', 
  agencyName: initialAgencyName = '', 
  agencyAddress: initialAddress = '', 
  representativeName: initialRepName = '', 
  position: initialPosition = '', 
  role 
}: ContractCardProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(contractStatus);
  const [currentRequestId, setCurrentRequestId] = useState(requestId);
  const [agencyName, setAgencyName] = useState(initialAgencyName);
  const [address, setAddress] = useState(initialAddress);
  const [representativeName, setRepresentativeName] = useState(initialRepName);
  const [position, setPosition] = useState(initialPosition);
  const [companySeal, setCompanySeal] = useState<string | null>(null);
  const { user } = useAuth();
  
  useEffect(() => {
    if (currentRequestId) {
        const fetchDetails = async () => {
            const reqDoc = await getDoc(doc(db, 'partnershipRequests', currentRequestId));
            if(reqDoc.exists()){
                const data = reqDoc.data();
                setAgencyName(data.agencyName || initialAgencyName);
                setAddress(data.agencyAddress || initialAddress);
                setRepresentativeName(data.representativeName || '');
                setPosition(data.position || '');
            }
        };
        fetchDetails();
    }
  }, [currentRequestId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setCompanySeal(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleAction = async (action: 'sign' | 'submit' | 'finalize') => {
    if (role === 'agent' && (!agencyName || !address || !representativeName || !position)) {
        toast.error("Please fill in all agency details.");
        return;
    }
    setLoading(true);
    try {
      let docId = currentRequestId;
      
      const updateData: any = {};
      if (role === 'agent') {
        updateData.agencyName = agencyName;
        updateData.agencyAddress = address;
        updateData.representativeName = representativeName;
        updateData.position = position;
        if (companySeal) updateData.companySeal = companySeal;
      }

      if (!docId) {
        const docRef = await addDoc(collection(db, 'partnershipRequests'), {
          agentId: user?.uid,
          universityId: universityId,
          status: 'pending',
          contractStatus: 'none',
          createdAt: serverTimestamp(),
          ...updateData
        });
        docId = docRef.id;
        setCurrentRequestId(docId);
      }

      const docRef = doc(db, 'partnershipRequests', docId!);
      
      if (role === 'agent') {
          const targetUniIds = new Set<string>();
          if (universityId) targetUniIds.add(universityId);

          const isGCM = (x: string) => x === 'global-college-malta' || x === 'gcm' || x === 'gcm-uid' || x.includes('gcm') || x.includes('malta');
          if (Array.from(targetUniIds).some(id => isGCM(id.toLowerCase()))) {
            targetUniIds.add('global-college-malta');
            targetUniIds.add('gcm');
            targetUniIds.add('gcm-uid');
          }

          if (action === 'sign') {
            updateData.contractSigned = true;
            updateData.contractSignedAt = serverTimestamp();
            updateData.contractStatus = 'signed';
            await updateDoc(docRef, updateData);
            setStatus('signed');
            toast.success('Contract details saved and signed!');
          } else if (action === 'submit') {
            updateData.contractSubmitted = true;
            updateData.contractSubmittedAt = serverTimestamp();
            updateData.contractStatus = 'submitted';
            await updateDoc(docRef, updateData);
            setStatus('submitted');
            toast.success('Contract submitted for approval!');
          }

          for (const targetId of targetUniIds) {
            try {
              await addDoc(collection(db, 'notifications'), {
                userId: targetId,
                title: action === 'sign' ? 'Agreement Signed 📝' : 'Agreement Submitted 📝',
                description: `${agencyName || representativeName || 'An agent partner'} has ${action === 'sign' ? 'signed' : 'submitted'} the agreement.`,
                category: 'ai-alerts',
                isUnread: true,
                createdAt: serverTimestamp(),
              });
            } catch (notifErr) {
              console.error("Non-blocking error creating notification:", notifErr);
            }
          }
      } else if (role === 'institution') {
          if (action === 'finalize') {
              await updateDoc(docRef, {
                  contractStatus: 'finalized',
                  finalizedAt: serverTimestamp(),
                  expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
              });
              setStatus('finalized');
              toast.success('Contract finalized!');
          }
      }
    } catch (err) {
      console.error("Error updating contract:", err);
      toast.error("Failed to update contract status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-blue-100 shadow-sm shadow-blue-50 space-y-6">
      <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest flex items-center gap-2">
        <FileText size={16} />
        Agency Details
      </h3>
      
      {role === 'agent' && (
      <div className="space-y-4">
          <input 
            placeholder="Company Name"
            disabled={status === 'finalized'}
            value={agencyName}
            onChange={(e) => setAgencyName(e.target.value)}
            className="w-full p-4 rounded-2xl border border-slate-200 text-sm"
          />
          <input 
            placeholder="Company Address"
            disabled={status === 'finalized'}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full p-4 rounded-2xl border border-slate-200 text-sm"
          />
          <input 
            placeholder="Representative Name"
            disabled={status === 'finalized'}
            value={representativeName}
            onChange={(e) => setRepresentativeName(e.target.value)}
            className="w-full p-4 rounded-2xl border border-slate-200 text-sm"
          />
          <input 
            placeholder="Position"
            disabled={status === 'finalized'}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="w-full p-4 rounded-2xl border border-slate-200 text-sm"
          />
          <div className="border border-slate-200 p-4 rounded-2xl dashed">
              <label className="text-xs text-slate-500">Company Seal (JPG, JPEG, PNG)</label>
              <input type="file" accept="image/jpeg,image/jpg,image/png" onChange={handleFileChange} className="block w-full text-sm mt-2" />
          </div>
          <div className="text-xs text-slate-500">Date: {new Date().toLocaleDateString()}</div>
      </div>
      )}

      {role === 'agent' && status !== 'finalized' && (
        <div className="space-y-4">
          <button className="w-full py-3 border-2 border-blue-600 text-blue-600 font-bold rounded-2xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
            View Official Contract
          </button>
          <div className="grid grid-cols-2 gap-4">
            <button 
              disabled={loading}
              onClick={() => handleAction('sign')}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Sign'}
            </button>
            <button 
              disabled={loading}
              onClick={() => handleAction('submit')}
              className="w-full py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Submit'}
            </button>
          </div>
        </div>
      )}

      {status === 'submitted' && role !== 'agent' && (
        <div className="space-y-4">
            <div className="p-4 bg-slate-100 text-slate-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-2">
            <CheckCircle2 size={16} /> Pending Review & Finalization
            </div>
            {role === 'institution' && (
                <button 
                disabled={loading}
                onClick={() => handleAction('finalize')}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Approve & Finalize'}
              </button>
            )}
        </div>
      )}
      
      {status === 'finalized' && (
        <div className="p-4 bg-blue-50 text-blue-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-2">
          <CheckCircle2 size={16} /> Agreement Finalized
        </div>
      )}
    </div>
  );
}