"use client"

import { useEffect, useState } from "react"
import type { NoteType } from "@/lib/types"
import { useNotesStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Star, Archive, Trash, RotateCcw, FolderClosed, Save, Check } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

interface NoteEditorProps {
  note: NoteType
}

export default function NoteEditor({ note }: NoteEditorProps) {
  const { updateNote, deleteNote, restoreNote, toggleStarred, toggleArchived, tags } = useNotesStore()

  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [selectedTags, setSelectedTags] = useState<string[]>(note.tags)
  const [isSaving, setIsSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  // Update local state when note changes
  useEffect(() => {
    setTitle(note.title)
    setContent(note.content)
    setSelectedTags(note.tags)
  }, [note])

  // Save changes when title or content changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (title !== note.title || content !== note.content) {
        updateNote(note.id, { title, content })
        setIsSaving(true)

        // Show saving indicator briefly
        setTimeout(() => {
          setIsSaving(false)
          setShowSaved(true)

          // Hide the saved indicator after a moment
          setTimeout(() => {
            setShowSaved(false)
          }, 1500)
        }, 500)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [title, content, note.id, note.title, note.content, updateNote])

  // Handle tag (folder) selection
  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) => {
      const newTags = prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]

      // Update note with new tags
      updateNote(note.id, { tags: newTags })
      return newTags
    })
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="p-4 border-b flex justify-between items-center">
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1"
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-medium border-none shadow-none focus-visible:ring-0 focus:outline-none px-0 h-auto"
            placeholder="Note title"
          />
        </motion.div>

        <div className="flex items-center gap-2">
          <div className="relative w-6 h-6 flex items-center justify-center">
            <AnimatePresence>
              {isSaving && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Save className="h-4 w-4 text-gray-400" />
                </motion.div>
              )}

              {showSaved && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Check className="h-4 w-4 text-green-500" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {note.isDeleted ? (
            <Button variant="ghost" size="icon" onClick={() => restoreNote(note.id)} title="Restore">
              <RotateCcw className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" title="Folders" className="rounded-full">
                    <FolderClosed className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 rounded-lg">
                  <div className="space-y-2">
                    <h4 className="font-medium">Folders</h4>
                    {tags.length > 0 ? (
                      <div className="space-y-2">
                        {tags.map((tag) => (
                          <div key={tag.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`folder-${tag.id}`}
                              checked={selectedTags.includes(tag.id)}
                              onCheckedChange={() => handleTagToggle(tag.id)}
                            />
                            <Label htmlFor={`folder-${tag.id}`}>{tag.name}</Label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No folders available</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  toggleStarred(note.id)
                  toast(note.isStarred ? "Note unstarred" : "Note starred")
                }}
                title={note.isStarred ? "Unstar" : "Star"}
                className="rounded-full"
              >
                <Star className={`h-4 w-4 ${note.isStarred ? "fill-yellow-400 text-yellow-400" : ""}`} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  toggleArchived(note.id)
                  toast(note.isArchived ? "Note unarchived" : "Note archived")
                }}
                title={note.isArchived ? "Unarchive" : "Archive"}
                className="rounded-full"
              >
                <Archive className={`h-4 w-4 ${note.isArchived ? "text-blue-500" : ""}`} />
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              deleteNote(note.id)
              toast(note.isDeleted ? "Note deleted permanently" : "Note moved to trash")
            }}
            title={note.isDeleted ? "Delete permanently" : "Move to trash"}
            className="rounded-full"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <motion.div
          className=""
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[calc(100vh-200px)] w-full resize-none border-0 outline-none focus:outline-none focus:ring-0 p-0 bg-transparent text-base"
            placeholder="Start writing..."
            style={{ outline: "none", boxShadow: "none" }}
          />
        </motion.div>
      </ScrollArea>
    </div>
  )
}
