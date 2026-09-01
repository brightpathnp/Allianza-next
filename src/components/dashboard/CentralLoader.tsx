'use client'

import React from 'react'

interface CentralLoaderProps {
  minHeight?: string
}

export const CentralLoader: React.FC<CentralLoaderProps> = ({ minHeight = "min-h-[400px]" }) => {
  return (
    <div className={`flex items-center justify-center ${minHeight} w-full`}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0059E7]"></div>
    </div>
  )
}