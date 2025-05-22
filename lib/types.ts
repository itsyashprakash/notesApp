export type NoteType = {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
  tags: string[]
  isStarred: boolean
  isArchived: boolean
  isDeleted: boolean
  type: "note"
}

export type TagType = {
  id: string
  name: string
  type: "folder"
  color?: string
}

export type EventType = {
  id: string
  title: string
  description: string
  startDate: number
  endDate: number | null
  isAllDay: boolean
  reminderTime: number | null
  noteId: string | null
  color: string
  tagId: string | null
  customSoundUrl?: string | null
}

export type ViewType = "notes" | "starred" | "archived" | "trash" | "untagged" | "tag" | "calendar"
