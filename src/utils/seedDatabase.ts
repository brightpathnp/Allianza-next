import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export const seedFirestorePlatformData = async () => {
  console.log('Starting Firestore Seeding...');
  const batch = writeBatch(db);

  // 1. Seed Platform Settings
  const settingsRef = doc(db, 'platform_settings', 'configurations');
  const settingsData = {
    countries: ["Nepal", "Malta", "Georgia", "United Kingdom", "United Arab Emirates"],
    degrees: ["Bachelor of Arts (BA)", "Bachelor of Science (BSc)", "Master of Business Administration (MBA)", "Master of Science (MSc)", "PhD"],
    disciplines: ["Management", "Marketing", "Tourism and Events Management", "Software Development", "AI Automation"],
    currencies: ["EUR (€)", "USD ($)", "NPR (₨)"]
  };
  batch.set(settingsRef, settingsData);

  // 2. Seed Agents
  const agents = [
    {
      id: 'agent_001',
      agencyName: 'Kathmandu Educational Services',
      ceoName: 'Prashant Sharma',
      email: 'contact@ktmedu.np',
      country: 'Nepal',
      status: 'pending',
      baseCommissionPercentage: 0,
      walletBalance: 0,
      creditLimit: 0,
      createdAt: new Date().toISOString()
    },
    {
      id: 'agent_002',
      agencyName: 'Global Bridge Partners',
      ceoName: 'Elena Rossi',
      email: 'info@globalbridge.it',
      country: 'Malta',
      status: 'approved',
      baseCommissionPercentage: 15,
      walletBalance: 2450.75,
      creditLimit: 5000,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'agent_003',
      agencyName: 'UK Study Route Ltd',
      ceoName: 'Mark Thompson',
      email: 'admin@ukstudy.co.uk',
      country: 'United Kingdom',
      status: 'suspended',
      baseCommissionPercentage: 10,
      walletBalance: -120.00,
      creditLimit: 1000,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  agents.forEach(agent => {
    const ref = doc(db, 'agents', agent.id);
    batch.set(ref, agent);
  });

  // 3. Seed Universities
  const universities = [
    {
      id: 'uni_001',
      name: 'European Business University (EBU)',
      country: 'Luxembourg',
      campuses: ['Wiltz Castle'],
      intakes: ['Autumn 2026', 'Spring 2027'],
      disciplines: ['Management', 'Software Development'],
      status: 'approved',
      featured: true
    },
    {
      id: 'uni_002',
      name: 'London School of Informatics',
      country: 'United Kingdom',
      campuses: ['Central London', 'Manchester'],
      intakes: ['Autumn 2026'],
      disciplines: ['AI Automation', 'Data Science'],
      status: 'pending',
      featured: false
    },
    {
      id: 'uni_003',
      name: 'Malta Institute of Technology',
      country: 'Malta',
      campuses: ['Valletta Campus'],
      intakes: ['Autumn 2026', 'Spring 2027'],
      disciplines: ['Software Development', 'Marketing'],
      status: 'approved',
      featured: false
    }
  ];

  universities.forEach(uni => {
    const ref = doc(db, 'universities', uni.id);
    batch.set(ref, uni);
  });

  // 4. Seed Audit Logs
  const logs = [
    {
      id: 'log_001',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      adminId: 'admin_sys',
      adminEmail: 'bec.edu.ktm@gmail.com',
      actionType: 'SETTINGS_MUTATE',
      targetEntityId: 'configurations',
      details: 'Added "Georgia" to global country matrix.',
      payload: { before: null, after: { added: 'Georgia' } }
    },
    {
      id: 'log_002',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      adminId: 'admin_sys',
      adminEmail: 'bec.edu.ktm@gmail.com',
      actionType: 'USER_APPROVE',
      targetEntityId: 'agent_002',
      details: 'Elevated Global Bridge Partners to approved status.',
      payload: { before: { status: 'pending' }, after: { status: 'approved' } }
    },
    {
      id: 'log_003',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      adminId: 'admin_sys',
      adminEmail: 'bec.edu.ktm@gmail.com',
      actionType: 'COMMISSION_ADJUST',
      targetEntityId: 'agent_002',
      details: 'Increased base commission to 15% for high-velocity Q1 performance.',
      payload: { before: { commission: 10 }, after: { commission: 15 } }
    },
    {
      id: 'log_004',
      timestamp: new Date(Date.now() - 172800000).toISOString(),
      adminId: 'admin_sys',
      adminEmail: 'bec.edu.nep@gmail.com',
      actionType: 'SETTINGS_MUTATE',
      targetEntityId: 'configurations',
      details: 'Initialized degree matrices for 2026/27 cycle.',
      payload: { before: {}, after: { degrees: settingsData.degrees } }
    },
    {
      id: 'log_005',
      timestamp: new Date(Date.now() - 259200000).toISOString(),
      adminId: 'admin_sys',
      adminEmail: 'bec.edu.ktm@gmail.com',
      actionType: 'IMPERSONATION_START',
      targetEntityId: 'agent_003',
      details: 'Diagnostic audit of agent wallet discrepancies.',
      payload: { before: null, after: { target: 'agent_003' } }
    }
  ];

  logs.forEach(log => {
    const ref = doc(db, 'system_logs', log.id);
    batch.set(ref, log);
  });

  await batch.commit();
  console.log('Seeding Complete.');
  return { success: true, message: 'Database seeded with high-fidelity production data.' };
};
