"use client"

import { useState, useEffect, useMemo } from "react"
import { useNotesStore } from "@/lib/store"
import {
  FileText,
  Star,
  Archive,
  Trash,
  Search,
  Plus,
  FolderClosed,
  SlidersHorizontal,
  FolderPlus,
  FolderEdit,
  FolderMinus,
  Calendar,
  AlertCircle,
  PlusCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from 'next/dynamic'
// import NoteEditor from "@/components/note-editor" // Will be dynamically imported
import NoteList from "@/components/note-list"
// import EmptyNoteState from "@/components/empty-note-state" // Will be dynamically imported
import { Checkbox } from "@/components/ui/checkbox"
// import CalendarView from "@/components/calendar-view" // Will be dynamically imported
import { Toaster } from "sonner"
import LoadingState from "./loading-state"

const NoteEditor = dynamic(() => import('@/components/note-editor'), {
  ssr: false,
  loading: () => <LoadingState />,
})

const CalendarView = dynamic(() => import('@/components/calendar-view'), {
  ssr: false,
  loading: () => <LoadingState />,
})

const EmptyNoteState = dynamic(() => import('@/components/empty-note-state'), {
  ssr: false,
  loading: () => <LoadingState />,
})

export default function NotesApp() {
  const {
    notes,
    tags,
    events,
    activeNote,
    activeView,
    activeTag,
    isLoading,
    error,
    addNote,
    addTag,
    updateTag,
    deleteTag,
    setActiveView,
    setActiveNote,
    emptyTrash,
    deleteNote,
  } = useNotesStore()

  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false)
  const [isDeleteTagDialogOpen, setIsDeleteTagDialogOpen] = useState(false)
  const [isTrashDialogOpen, setIsTrashDialogOpen] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState("#3788d8")
  const [isEditingTag, setIsEditingTag] = useState(false)
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [searchTagsQuery, setSearchTagsQuery] = useState("")
  const [searchNotesQuery, setSearchNotesQuery] = useState("")

  const [isMultiSelecting, setIsMultiSelecting] = useState(false)
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([])

  // Add state for folder multi-selection
  const [isMultiSelectingFolders, setIsMultiSelectingFolders] = useState(false)
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([])

  // Filter notes based on active view and search query
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      let viewMatch = false
      switch (activeView) {
        case "notes":
          viewMatch = !note.isDeleted && !note.isArchived
          break
        case "starred":
          viewMatch = !note.isDeleted && !note.isArchived && note.isStarred
          break
        case "archived":
          viewMatch = !note.isDeleted && note.isArchived
          break
        case "trash":
          viewMatch = note.isDeleted
          break
        case "tag":
          viewMatch = !note.isDeleted && !note.isArchived && activeTag ? note.tags.includes(activeTag) : false
          break
      }

      const searchMatch = searchNotesQuery
        ? note.title.toLowerCase().includes(searchNotesQuery.toLowerCase()) ||
          note.content.toLowerCase().includes(searchNotesQuery.toLowerCase())
        : true

      return viewMatch && searchMatch
    })
  }, [notes, activeView, activeTag, searchNotesQuery])

  // Filter tags based on search query
  const filteredTags = useMemo(() => {
    return tags.filter((tag) =>
      searchTagsQuery ? tag.name.toLowerCase().includes(searchTagsQuery.toLowerCase()) : true
    )
  }, [tags, searchTagsQuery])

  // Memoized view title
  const viewTitle = useMemo(() => {
    switch (activeView) {
      case "notes":
        return "All Notes"
      case "starred":
        return "Starred"
      case "archived":
        return "Archived"
      case "trash":
        return "Trash"
      case "tag":
        const tag = tags.find((t) => t.id === activeTag)
        return tag ? tag.name : "Folder"
      case "calendar":
        return "Calendar"
    }
  }, [activeView, tags, activeTag])

  // Memoized note counts for static views
  const allNotesCount = useMemo(() => notes.filter(note => !note.isDeleted && !note.isArchived).length, [notes])
  const starredNotesCount = useMemo(() => notes.filter(note => !note.isDeleted && !note.isArchived && note.isStarred).length, [notes])
  const archivedNotesCount = useMemo(() => notes.filter(note => !note.isDeleted && note.isArchived).length, [notes])
  const trashNotesCount = useMemo(() => notes.filter(note => note.isDeleted).length, [notes])

  // Memoized note counts for tags
  const notesByTagCount = useMemo(() => {
    const counts = new Map<string, number>()
    tags.forEach(tag => {
      const count = notes.filter(note => !note.isDeleted && !note.isArchived && note.tags.includes(tag.id)).length
      counts.set(tag.id, count)
    })
    return counts
  }, [notes, tags])

  // Handle tag operations
  const handleCreateTag = () => {
    if (!newTagName.trim()) {
      toast.error("Folder name is required")
      return
    }

    if (isEditingTag && selectedTagId) {
      updateTag(selectedTagId, { name: newTagName, color: newTagColor })
      toast.success("Folder updated")
    } else {
      addTag({ name: newTagName, color: newTagColor, type: "folder" })
      toast.success("Folder created")
    }

    setNewTagName("")
    setNewTagColor("#3788d8")
    setIsEditingTag(false)
    setSelectedTagId(null)
    setIsTagDialogOpen(false)
  }

  const handleEditTag = (tagId: string) => {
    const tag = tags.find((t) => t.id === tagId)
    if (tag) {
      setNewTagName(tag.name)
      setNewTagColor(tag.color || "#3788d8")
      setSelectedTagId(tagId)
      setIsEditingTag(true)
      setIsTagDialogOpen(true)
    }
  }

  const handleDeleteTag = () => {
    if (selectedTagId) {
      deleteTag(selectedTagId)
      toast.success("Folder deleted")
      setIsDeleteTagDialogOpen(false)
      setSelectedTagId(null)
    }
  }

  const handleEmptyTrash = () => {
    emptyTrash()
    setIsTrashDialogOpen(false)
  }

  const handleCreateNote = async () => {
    const id = await addNote({
      title: "New Note",
      content: "",
      tags: [],
    })
    setActiveNote(id)
  }

  // Add handlers for folder multi-selection
  const toggleMultiSelectingFolders = (isChecked: boolean) => {
    setIsMultiSelectingFolders(isChecked)
    setSelectedFolderIds([]) // Clear selection when toggling mode
  }

  const toggleSelectFolder = (folderId: string) => {
    setSelectedFolderIds((prev) =>
      prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]
    )
  }

  const handleSelectAllFolders = () => {
    if (selectedFolderIds.length === filteredTags.length) {
      setSelectedFolderIds([])
    } else {
      setSelectedFolderIds(filteredTags.map((tag) => tag.id))
    }
  }

  const handleDeleteSelectedFolders = () => {
    selectedFolderIds.forEach((tagId) => {
      deleteTag(tagId)
    })
    setSelectedFolderIds([])
    setIsMultiSelectingFolders(false)
    toast.success(`${selectedFolderIds.length} folder(s) deleted`)
  }

  // Handle multi-selection
  const toggleMultiSelecting = () => {
    setIsMultiSelecting(!isMultiSelecting)
    setSelectedNoteIds([]) // Clear selection when toggling mode
  }

  const toggleSelectNote = (noteId: string) => {
    setSelectedNoteIds((prev) =>
      prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]
    )
  }

  const handleSelectAll = () => {
    if (selectedNoteIds.length === filteredNotes.length) {
      setSelectedNoteIds([])
    } else {
      setSelectedNoteIds(filteredNotes.map((note) => note.id))
    }
  }

  const handleDeleteSelected = () => {
    selectedNoteIds.forEach((noteId) => {
      deleteNote(noteId)
    })
    setSelectedNoteIds([])
    setIsMultiSelecting(false)
    toast.success(`${selectedNoteIds.length} note(s) moved to trash`)
  }

  // Get the active note object
  const currentNote = notes.find((note) => note.id === activeNote)

  if (isLoading) {
    return <LoadingState />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <motion.div
        className="w-80 border-r bg-gray-50 flex flex-col"
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search sections..."
              className="w-full pl-8 bg-white rounded-lg"
              value={searchTagsQuery}
              onChange={(e) => setSearchTagsQuery(e.target.value)}
            />
          </div>
        </div>

        <nav className="space-y-1 px-2">
          {/* Filter static sections based on searchTagsQuery */}
          {"All Notes".toLowerCase().includes(searchTagsQuery.toLowerCase()) && (
            <Button
              variant={activeView === "notes" ? "secondary" : "ghost"}
              className="w-full justify-start gap-2 font-normal rounded-lg"
              onClick={() => setActiveView("notes")}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  All Notes
                </div>
                <span className="text-sm text-muted-foreground">({allNotesCount})</span>
              </div>
            </Button>
          )}

          {"Calendar".toLowerCase().includes(searchTagsQuery.toLowerCase()) && (
            <Button
              variant={activeView === "calendar" ? "secondary" : "ghost"}
              className="w-full justify-start gap-2 font-normal rounded-lg"
              onClick={() => setActiveView("calendar")}
            >
              <Calendar className="h-4 w-4" />
              Calendar
            </Button>
          )}

          {"Starred".toLowerCase().includes(searchTagsQuery.toLowerCase()) && (
            <Button
              variant={activeView === "starred" ? "secondary" : "ghost"}
              className="w-full justify-start gap-2 font-normal rounded-lg"
              onClick={() => setActiveView("starred")}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Starred
                </div>
                <span className="text-sm text-muted-foreground">({starredNotesCount})</span>
              </div>
            </Button>
          )}

          {"Archived".toLowerCase().includes(searchTagsQuery.toLowerCase()) && (
            <Button
              variant={activeView === "archived" ? "secondary" : "ghost"}
              className="w-full justify-start gap-2 font-normal rounded-lg"
              onClick={() => setActiveView("archived")}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  Archived
                </div>
                <span className="text-sm text-muted-foreground">({archivedNotesCount})</span>
              </div>
            </Button>
          )}

          {"Trash".toLowerCase().includes(searchTagsQuery.toLowerCase()) && (
            <Button
              variant={activeView === "trash" ? "secondary" : "ghost"}
              className="w-full justify-start gap-2 font-normal rounded-lg"
              onClick={() => setActiveView("trash")}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Trash className="h-4 w-4" />
                  Trash
                </div>
                <span className="text-sm text-muted-foreground">({trashNotesCount})</span>
              </div>
            </Button>
          )}

          <div className="pt-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Folders</h3>
              <div className="flex items-center gap-1">
                 {isMultiSelectingFolders && selectedFolderIds.length > 0 && (
                  <Button variant="outline" size="sm" className="bg-red-500 hover:bg-red-600 text-white" onClick={handleDeleteSelectedFolders}>
                    Delete Selected
                  </Button>
                )}
                 {isMultiSelectingFolders && selectedFolderIds.length === 0 && filteredTags.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleSelectAllFolders}>
                    {selectedFolderIds.length === filteredTags.length ? "Deselect All" : "Select All"}
                  </Button>
                )}
                {/* Toggle multi-selection for folders */}
                <Checkbox
                  id="multi-select-folder-toggle"
                  checked={isMultiSelectingFolders}
                  onCheckedChange={(checked) => {
                    if (typeof checked === 'boolean') {
                      toggleMultiSelectingFolders(checked);
                    }
                  }}
                  className="ml-2"
                />
                <Label htmlFor="multi-select-folder-toggle" className="text-xs text-gray-500">Select</Label>

                {/* Add folder button (keep existing) */}
                {!isMultiSelectingFolders && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setIsEditingTag(false)
                      setNewTagName("")
                      setNewTagColor("#3788d8")
                      setIsTagDialogOpen(true)
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            {/* Wrap the folder list in ScrollArea */}
            <ScrollArea className="h-40 pr-2 mt-2">
              <div className="space-y-1">
                {/* Filtered tags based on searchTagsQuery */}
                {filteredTags.map((tag) => (
                  <div key={tag.id} className={`group relative flex items-center justify-between rounded-lg transition-colors ${activeTag === tag.id ? "bg-secondary" : "hover:bg-gray-100"}`}>
                    {/* Use a div instead of Button for the main clickable area */}
                    <div
                      className="w-full justify-start gap-2 font-normal rounded-lg pr-8 p-2 flex items-center cursor-pointer"
                      onClick={() => {
                         if (isMultiSelectingFolders) {
                          toggleSelectFolder(tag.id);
                         } else {
                          setActiveView("tag", tag.id);
                         }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {/* Folder selection checkbox */}
                        {isMultiSelectingFolders && (
                          <Checkbox
                             checked={selectedFolderIds.includes(tag.id)}
                             onCheckedChange={() => toggleSelectFolder(tag.id)}
                             onClick={(e) => e.stopPropagation()}
                             className="mr-2"
                          />
                        )}
                        <FolderClosed className="h-4 w-4" style={{ color: tag.color }} />
                        {tag.name}
                      </div>
                      <span className="text-sm text-muted-foreground ml-auto">({notesByTagCount.get(tag.id) || 0})</span>
                    </div>
                    {/* Edit/Delete buttons (show only when not in multi-select mode) */}
                    {!isMultiSelectingFolders && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-1 bg-gray-100 p-1 rounded-md">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditTag(tag.id)
                          }}
                        >
                          <FolderEdit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedTagId(tag.id)
                            setIsDeleteTagDialogOpen(true)
                          }}
                        >
                          <FolderMinus className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </nav>
      </motion.div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <div className="border-b">
          <div className="flex h-14 items-center gap-4 px-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{viewTitle}</h2>
              {activeView === "notes" && (
                <span className="text-sm text-muted-foreground">
                  ({filteredNotes.length} notes)
                </span>
              )}
            </div>
            <div className="flex-1" />
            {activeView === "trash" ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setIsTrashDialogOpen(true)}>
                      Empty Trash
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Permanently delete all notes in trash</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <>
                {!isMultiSelecting && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={handleCreateNote}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
          <div className="px-4 pb-4">
            {/* Conditionally render search input */}
            {activeView !== "calendar" && (
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search notes..."
                  className="w-full pl-8 bg-white rounded-lg"
                  value={searchNotesQuery}
                  onChange={(e) => setSearchNotesQuery(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeView !== "calendar" && filteredNotes.length > 0 && (
            <div className="p-4 border-b flex items-center justify-between text-sm text-gray-700">
              {/* Multi-selection toggle checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="multi-select-toggle"
                  checked={isMultiSelecting}
                  onCheckedChange={(checked) => {
                    if (typeof checked === 'boolean') {
                      setIsMultiSelecting(checked);
                    }
                  }}
                />
                <Label htmlFor="multi-select-toggle">Select note</Label>
              </div>
              {isMultiSelecting && selectedNoteIds.length > 0 && (
                <Button variant="outline" size="sm" className="bg-red-500 hover:bg-red-600 text-white" onClick={handleDeleteSelected}>
                  Delete Selected
                </Button>
              )}
              {isMultiSelecting && selectedNoteIds.length === 0 && filteredNotes.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedNoteIds.length === filteredNotes.length ? "Deselect All" : "Select All"}
                </Button>
              )}
            </div>
          )}
          {filteredNotes.length > 0 ? (
            <div className="flex h-full">
              {activeView === "calendar" ? (
                <CalendarView />
              ) : (
                <NoteList
                  notes={filteredNotes}
                  activeNoteId={activeNote}
                  onSelectNote={setActiveNote}
                  isMultiSelecting={isMultiSelecting}
                  selectedNoteIds={selectedNoteIds}
                  onToggleSelectNote={toggleSelectNote}
                />
              )}
              {activeView !== "calendar" && (
                <div className="flex-1 overflow-y-auto">
                  {currentNote ? (
                    <NoteEditor note={currentNote} />
                  ) : (
                    <EmptyNoteState onCreateNote={handleCreateNote} />
                  )}
                </div>
              )}
            </div>
          ) : activeView === "calendar" ? (
            <CalendarView />
          ) : (
            <EmptyNoteState onCreateNote={handleCreateNote} />
          )}
        </div>
      </div>

      {/* Folder Dialog */}
      <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditingTag ? "Edit Folder" : "Create Folder"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Enter folder name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2">
                {["#3788d8", "#f44336", "#4CAF50", "#FF9800", "#9C27B0", "#795548"].map((color) => (
                  <div
                    key={color}
                    className={`w-8 h-8 rounded-full cursor-pointer border-2 ${
                      newTagColor === color ? "border-black" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewTagColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTagDialogOpen(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button onClick={handleCreateTag} className="rounded-lg">
              {isEditingTag ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Empty Trash Confirmation Dialog */}
      <AlertDialog open={isTrashDialogOpen} onOpenChange={setIsTrashDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Empty Trash?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all notes in the trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEmptyTrash} className="bg-red-500 hover:bg-red-600 rounded-lg">
              Empty Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Folder Confirmation Dialog */}
      <AlertDialog open={isDeleteTagDialogOpen} onOpenChange={setIsDeleteTagDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the folder and its association with notes. The notes will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTag} className="bg-red-500 hover:bg-red-600 rounded-lg">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster position="top-right" closeButton={true} richColors />
    </div>
  )
}
