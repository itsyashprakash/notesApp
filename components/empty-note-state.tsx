"use client"

import { FileText, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

interface EmptyNoteStateProps {
  onCreateNote: () => void
}

export default function EmptyNoteState({ onCreateNote }: EmptyNoteStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <motion.div
        className="text-center p-8 max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-medium text-gray-700 mb-2">No note selected</h2>
        <p className="text-gray-500 mb-6">Select an existing note or create a new one to get started</p>
        <Button onClick={onCreateNote} className="gap-2">
          <Plus className="h-4 w-4" />
          Create new note
        </Button>
      </motion.div>
    </div>
  )
}
