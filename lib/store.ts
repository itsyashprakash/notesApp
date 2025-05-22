"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { NoteType, TagType, ViewType, EventType } from "./types"
import { toast } from "sonner"

interface NotesState {
  notes: NoteType[]
  tags: TagType[]
  events: EventType[]
  activeNote: string | null
  activeView: ViewType
  activeTag: string | null
  isLoading: boolean
  error: string | null
  addNote: (note: Partial<NoteType>) => string
  updateNote: (id: string, updates: Partial<NoteType>) => void
  deleteNote: (id: string | string[]) => void
  restoreNote: (id: string) => void
  toggleStarred: (id: string) => void
  toggleArchived: (id: string) => void
  emptyTrash: () => void
  addTag: (tag: Partial<TagType>) => string
  updateTag: (id: string, updates: Partial<TagType>) => void
  deleteTag: (id: string) => void
  setActiveNote: (id: string | null) => void
  setActiveView: (view: ViewType, tagId?: string | null) => void
  addEvent: (event: Partial<EventType>) => string
  updateEvent: (id: string, updates: Partial<EventType>) => void
  deleteEvent: (id: string) => void
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: [],
      tags: [],
      events: [],
      activeNote: null,
      activeView: "notes",
      activeTag: null,
      isLoading: false,
      error: null,

      addNote: (note) => {
        const id = Date.now().toString()
        const newNote: NoteType = {
          id,
          title: note.title || "New Note",
          content: note.content || "",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: note.tags || [],
          isStarred: note.isStarred || false,
          isArchived: note.isArchived || false,
          isDeleted: note.isDeleted || false,
          type: "note",
        }
        set((state) => ({
          notes: [newNote, ...state.notes],
          activeNote: id,
        }))
        return id
      },

      updateNote: (id, updates) => {
        set((state) => ({
          notes: state.notes.map((note) => (note.id === id ? { ...note, ...updates, updatedAt: Date.now() } : note)),
        }))
      },

      deleteNote: (id) => {
        set((state) => {
          const ids = Array.isArray(id) ? id : [id]
          const notesToDelete = state.notes.filter(note => ids.includes(note.id))
          const isCurrentlyDeleted = notesToDelete.every(note => note.isDeleted)

          // If already in trash, permanently delete
          if (isCurrentlyDeleted) {
            const count = notesToDelete.length
            toast.success(`${count} ${count === 1 ? 'note' : 'notes'} permanently deleted`)
            return {
              notes: state.notes.filter((note) => !ids.includes(note.id)),
              activeNote: state.activeNote && ids.includes(state.activeNote) ? null : state.activeNote,
            }
          }

          // Otherwise, move to trash
          toast.success("Note moved to trash")
          return {
            notes: state.notes.map((note) => 
              ids.includes(note.id) ? { ...note, isDeleted: true } : note
            ),
            activeNote: state.activeNote && ids.includes(state.activeNote) ? null : state.activeNote,
          }
        })
      },

      restoreNote: (id) => {
        set((state) => ({
          notes: state.notes.map((note) => (note.id === id ? { ...note, isDeleted: false } : note)),
        }))
        toast.success("Note restored from trash")
      },

      toggleStarred: (id) => {
        set((state) => ({
          notes: state.notes.map((note) => (note.id === id ? { ...note, isStarred: !note.isStarred } : note)),
        }))
      },

      toggleArchived: (id) => {
        set((state) => ({
          notes: state.notes.map((note) => (note.id === id ? { ...note, isArchived: !note.isArchived } : note)),
        }))
      },

      emptyTrash: () => {
        set((state) => ({
          notes: state.notes.filter((note) => !note.isDeleted),
          activeNote: state.notes.find((n) => n.id === state.activeNote)?.isDeleted ? null : state.activeNote,
        }))
      },

      addTag: (tag) => {
        const id = Date.now().toString()
        const newTag: TagType = {
          id,
          name: tag.name || "New Folder",
          type: "folder",
          color: tag.color || "#3788d8",
        }
        set((state) => ({ tags: [...state.tags, newTag] }))
        return id
      },

      updateTag: (id, updates) => {
        set((state) => ({
          tags: state.tags.map((tag) => (tag.id === id ? { ...tag, ...updates } : tag)),
        }))
      },

      deleteTag: (id) => {
        set((state) => {
          // Remove tag from all notes
          const updatedNotes = state.notes.map((note) => ({
            ...note,
            tags: note.tags.filter((tagId) => tagId !== id),
          }))

          // Remove tag from all events
          const updatedEvents = state.events.map((event) => ({
            ...event,
            tagId: event.tagId === id ? null : event.tagId,
          }))

          return {
            tags: state.tags.filter((tag) => tag.id !== id),
            notes: updatedNotes,
            events: updatedEvents,
            activeTag: state.activeTag === id ? null : state.activeTag,
          }
        })
      },

      setActiveNote: (id) => {
        set({ activeNote: id })
      },

      setActiveView: (view, tagId = null) => {
        set({
          activeView: view,
          activeTag: tagId,
          activeNote: null,
        })
      },

      addEvent: (event) => {
        const id = Date.now().toString()
        const newEvent: EventType = {
          id,
          title: event.title || "New Event",
          description: event.description || "",
          startDate: event.startDate || Date.now(),
          endDate: event.endDate || null,
          isAllDay: event.isAllDay || false,
          reminderTime: event.reminderTime || null,
          noteId: event.noteId || null,
          color: event.color || "#3788d8",
          tagId: event.tagId || null,
          customSoundUrl: event.customSoundUrl || null,
        }
        set((state) => ({
          events: [newEvent, ...state.events],
        }))
        return id
      },

      updateEvent: (id, updates) => {
        set((state) => ({
          events: state.events.map((event) => (event.id === id ? { ...event, ...updates } : event)),
        }))
      },

      deleteEvent: (id) => {
        set((state) => ({
          events: state.events.filter((event) => event.id !== id),
        }))
      },
    }),
    {
      name: "notes-storage",
    },
  ),
)
