"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import type { NoteType } from "@/lib/types"
import { formatDistanceToNow, format, isAfter, subDays } from "date-fns"
import { motion } from "framer-motion"
import { Checkbox } from "@/components/ui/checkbox"

interface NoteListProps {
  notes: NoteType[]
  activeNoteId: string | null
  onSelectNote: (id: string) => void
  isMultiSelecting: boolean
  selectedNoteIds: string[]
  onToggleSelectNote: (id: string) => void
}

export default function NoteList({ 
  notes, 
  activeNoteId, 
  onSelectNote,
  isMultiSelecting,
  selectedNoteIds,
  onToggleSelectNote 
}: NoteListProps) {
  // Format the timestamp based on how old the note is
  const formatTimestamp = (timestamp: number) => {
    const now = new Date()
    const yesterday = subDays(now, 1)
    const noteDate = new Date(timestamp)

    // If note is older than 24 hours, show date
    if (isAfter(yesterday, noteDate)) {
      return format(noteDate, "MMM d, yyyy")
    }

    // Otherwise show relative time
    return formatDistanceToNow(noteDate, { addSuffix: true })
  }

  if (notes.length === 0) {
    return (
      <div className="w-72 border-r flex items-center justify-center text-muted-foreground bg-gray-50">
        <div className="text-center p-6">
          <p>No items.</p>
          <p className="text-xs mt-2 text-gray-400">Create a new note to get started.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-72 border-r bg-gray-50">
      <ScrollArea className="h-full">
        <motion.div
          className="divide-y"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, staggerChildren: 0.05 }}
        >
          {notes.map((note, index) => (
            <motion.div
              key={note.id}
              className={`p-4 cursor-pointer hover:bg-gray-100 transition-colors ${
                activeNoteId === note.id ? "bg-gray-100 border-l-4 border-blue-500" : ""
              }`}
              onClick={() => !isMultiSelecting && onSelectNote(note.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
            >
              <div className="flex items-start gap-2">
                {isMultiSelecting && (
                  <Checkbox
                    checked={selectedNoteIds.includes(note.id)}
                    onCheckedChange={() => onToggleSelectNote(note.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{note.title || "Untitled"}</h3>
                  <div className="text-xs text-muted-foreground mt-1">{formatTimestamp(note.createdAt)}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </ScrollArea>
    </div>
  )
}
