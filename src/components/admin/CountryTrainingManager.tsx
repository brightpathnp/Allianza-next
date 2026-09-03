'use client'

import React, { useState, useEffect } from 'react'
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { toast } from 'sonner'
import { CentralLoader } from '@/components/dashboard/CentralLoader'
import { useRouter } from 'next/navigation'
import { Trash2, Save, PlayCircle, Globe, Video, ExternalLink, Award } from 'lucide-react'

const ALL_COUNTRIES_LIST = [
  { name: "Australia", flag: "🇦🇺" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "France", flag: "🇫🇷" },
  { name: "Georgia", flag: "🇬🇪" },
  { name: "Malta", flag: "🇲🇹" },
  { name: "United Arab Emirates", flag: "🇦🇪" },
  { name: "United Kingdom", flag: "🇬🇧" },
  { name: "United States", flag: "🇺🇸" }
]

const CountryTrainingManager = () => {
  const router = useRouter()
  const [videosByCountry, setVideosByCountry] = useState<Record<string, any>>({})
  const [inputUrls, setInputUrls] = useState<Record<string, string>>({})
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchVideos = async () => {
    setLoading(true)
    try {
      const q = query(collection(db, 'training_videos'), where('type', '==', 'super-admin'))
      const snap = await getDocs(q)
      const mapped: Record<string, any> = {}
      const inputs: Record<string, string> = {}
      
      snap.docs.forEach(docSnap => {
        const data = docSnap.data()
        if (data.country) {
          mapped[data.country] = { id: docSnap.id, ...data }
          inputs[data.country] = data.url || ''
        }
      })
      
      setVideosByCountry(mapped)
      setInputUrls(inputs)

      const quizzesSnap = await getDocs(collection(db, 'quizzes'))
      setQuizzes(quizzesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    } catch (err) {
      console.error("Error fetching country training videos:", err)
      toast.error("Failed to load training videos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVideos()
  }, [])

  const getEmbedUrl = (url: string) => {
    if (!url) return ''
    try {
      if (url.includes('youtube.com/watch?v=')) {
        const parts = url.split('v=')
        if (parts[1]) {
          const videoId = parts[1].split('&')[0]
          return `https://www.youtube.com/embed/${videoId}`
        }
      }
      if (url.includes('youtu.be/')) {
        const parts = url.split('youtu.be/')
        if (parts[1]) {
          const videoId = parts[1].split('?')[0]
          return `https://www.youtube.com/embed/${videoId}`
        }
      }
      if (url.includes('youtube.com/embed/')) {
        return url
      }
      return url
    } catch (e) {
      return url
    }
  }

  const handleSaveVideo = async (countryName: string) => {
    const url = inputUrls[countryName]?.trim()
    if (!url) {
      toast.error("Please enter a valid YouTube URL first")
      return
    }

    try {
      const existing = videosByCountry[countryName]
      if (existing) {
        await updateDoc(doc(db, 'training_videos', existing.id), {
          url: url,
          updatedAt: serverTimestamp()
        })
        toast.success(`Updated training video for ${countryName}!`)
      } else {
        const newDoc = await addDoc(collection(db, 'training_videos'), {
          title: `${countryName} Official Training Guide`,
          url: url,
          country: countryName,
          type: 'super-admin',
          createdAt: serverTimestamp()
        })
        toast.success(`Saved training video for ${countryName}!`)
      }
      fetchVideos()
    } catch (err) {
      console.error("Error saving video:", err)
      toast.error("Failed to save training video")
    }
  }

  const handleDeleteVideo = async (countryName: string) => {
    const existing = videosByCountry[countryName]
    if (!existing) return

    try {
      await deleteDoc(doc(db, 'training_videos', existing.id))
      toast.success(`Removed training video for ${countryName}`)
      setInputUrls(prev => {
        const copy = { ...prev }
        delete copy[countryName]
        return copy
      })
      fetchVideos()
    } catch (err) {
      console.error("Error deleting video:", err)
      toast.error("Failed to remove training video")
    }
  }

  const handleInputChange = (countryName: string, value: string) => {
    setInputUrls(prev => ({
      ...prev,
      [countryName]: value
    }))
  }

  return (
    <div id="country-training-manager" className="space-y-6 bg-white p-6 rounded-3xl border border-slate-150 shadow-sm mt-8">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <PlayCircle size={20} className="text-[#0059E7]" />
            Country Training Videos Controller
          </h2>
          <p className="text-xs text-slate-500 font-bold mt-1">
            Configure destination-specific training video guides for recruiting agents based on target countries.
          </p>
        </div>
        <Video size={20} className="text-slate-400" />
      </div>

      {loading ? (
        <CentralLoader minHeight="min-h-[200px]" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ALL_COUNTRIES_LIST.map((c) => {
            const video = videosByCountry[c.name]
            const embedUrl = video ? getEmbedUrl(video.url) : ''
            const currentUrlInput = inputUrls[c.name] || ''

            return (
              <div 
                key={c.name} 
                className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" role="img" aria-label={c.name}>{c.flag}</span>
                    <span className="text-sm font-black text-slate-900 font-outfit">{c.name}</span>
                  </div>
                  {video && (
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                      Configured
                    </span>
                  )}
                </div>

                <div className="aspect-video w-full bg-slate-200 rounded-xl overflow-hidden relative border border-slate-200 flex items-center justify-center">
                  {embedUrl ? (
                    <iframe 
                      src={embedUrl}
                      className="w-full h-full" 
                      title={`${c.name} training video`}
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  ) : (
                    <div className="text-center p-4 space-y-2">
                      <Globe size={28} className="mx-auto text-slate-300 stroke-1" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        No Active Feed Configured
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      YouTube Video Link
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. https://www.youtube.com/watch?v=..." 
                      value={currentUrlInput}
                      onChange={(e) => handleInputChange(c.name, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-[#0059E7] outline-none transition-all bg-white text-xs font-medium text-slate-800" 
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleSaveVideo(c.name)}
                      className="flex-1 py-2 bg-[#0059E7] hover:bg-[#0047b8] text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98"
                    >
                      <Save size={12} /> Save Config
                    </button>
                    {video && (
                      <button 
                        onClick={() => handleDeleteVideo(c.name)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200 transition-all cursor-pointer"
                        title="Delete video config"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {video && (
                    <button 
                      onClick={() => router.push(`/quiz-creator/${video.id}`)}
                      className="w-full mt-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-98"
                    >
                      <Award size={14} /> {quizzes.some(q => q.videoId === video.id) ? 'Edit Assessment Quiz' : 'Create Assessment Quiz'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CountryTrainingManager