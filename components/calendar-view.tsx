"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useNotesStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  addDays,
  parseISO,
  isToday,
  startOfWeek,
  endOfWeek,
  isSameWeek,
} from "date-fns"
import { Plus, Bell, ChevronLeft, ChevronRight, TagIcon, Edit, Trash2, AlertCircle, X } from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { notificationService } from "@/lib/notification-service"
import type { EventType } from "@/lib/types"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"

export default function CalendarView() {
  const { events, addEvent, updateEvent, deleteEvent } = useNotesStore()
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentView, setCurrentView] = useState<"month" | "week" | "day" | "list">("month")
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [reminderHours, setReminderHours] = useState("")
  const [reminderMinutes, setReminderMinutes] = useState("")

  // Add after other state declarations
  const [customSound, setCustomSound] = useState<File | null>(null)

  const [newEvent, setNewEvent] = useState({
    id: "",
    title: "",
    description: "",
    start: "",
    end: "",
    allDay: false,
    reminderTime: null as number | null,
    reminderType: "before" as "before" | "after" | "on-time",
    reminderValue: 15,
    reminderUnit: "minutes" as "minutes" | "hours" | "days",
    color: "#3788d8",
    tagId: null as string | null,
    customSoundUrl: null as string | null,
  })

  // Get days for the current month view
  const getDaysForMonthView = () => {
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    const days = eachDayOfInterval({ start, end })

    // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
    const startDay = getDay(start)

    // Add days from the previous month to fill the first row
    const previousMonthDays = Array.from({ length: startDay }, (_, i) => addDays(start, -(startDay - i)))

    // Get the day of the week for the last day
    const endDay = getDay(end)

    // Add days from the next month to fill the last row
    const nextMonthDays = Array.from({ length: 6 - endDay }, (_, i) => addDays(end, i + 1))

    return [...previousMonthDays, ...days, ...nextMonthDays]
  }

  // Get days for the current week view
  const getDaysForWeekView = () => {
    const start = startOfWeek(currentDate)
    const end = endOfWeek(currentDate)
    return eachDayOfInterval({ start, end })
  }

  // Filter events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.startDate)
      return isSameDay(eventDate, day)
    })
  }

  // Filter events for the selected date
  const getEventsForSelectedDate = () => {
    return events.filter((event) => {
      const eventDate = new Date(event.startDate)
      return isSameDay(eventDate, selectedDate)
    })
  }

  // Filter events for the current week
  const getEventsForWeek = () => {
    return events.filter((event) => {
      const eventDate = new Date(event.startDate)
      return isSameWeek(eventDate, currentDate)
    })
  }

  // Filter events for the current month
  const getEventsForMonth = () => {
    return events.filter((event) => {
      const eventDate = new Date(event.startDate)
      return isSameMonth(eventDate, currentDate)
    })
  }

  // Navigate to today
  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  // Navigate to previous month/week/day
  const goToPrevious = () => {
    if (currentView === "month") {
      setCurrentDate(subMonths(currentDate, 1))
    } else if (currentView === "week") {
      setCurrentDate(addDays(currentDate, -7))
    } else if (currentView === "day") {
      setCurrentDate(addDays(currentDate, -1))
      setSelectedDate(addDays(currentDate, -1))
    }
  }

  // Navigate to next month/week/day
  const goToNext = () => {
    if (currentView === "month") {
      setCurrentDate(addMonths(currentDate, 1))
    } else if (currentView === "week") {
      setCurrentDate(addDays(currentDate, 7))
    } else if (currentView === "day") {
      setCurrentDate(addDays(currentDate, 1))
      setSelectedDate(addDays(currentDate, 1))
    }
  }

  // Handle date selection
  const handleDateClick = (day: Date) => {
    setSelectedDate(day)
    if (currentView === "month") {
      // If clicking on a day in a different month, navigate to that month
      if (!isSameMonth(day, currentDate)) {
        setCurrentDate(day)
      }
    }
  }

  // Open event dialog for a specific day
  const openNewEventDialog = (day: Date) => {
    setSelectedDate(day)
    setNewEvent({
      id: "",
      title: "",
      description: "",
      start: new Date(day).toISOString(),
      end: "",
      allDay: false,
      reminderTime: null,
      reminderType: "before",
      reminderValue: 15,
      reminderUnit: "minutes",
      color: "#3788d8",
      tagId: null,
      customSoundUrl: null,
    })
    setReminderHours("")
    setReminderMinutes("")
    setIsEventDialogOpen(true)
  }

  // Open event dialog for editing an existing event
  const openEditEventDialog = (eventId: string) => {
    const event = events.find((e) => e.id === eventId)
    if (event) {
      // Calculate reminder values if a reminder is set
      let reminderType: "before" | "after" | "on-time" = "before"
      let reminderValue = 15
      let reminderUnit: "minutes" | "hours" | "days" = "minutes"
      let hours = ""
      let minutes = ""

      if (event.reminderTime) {
        const eventTime = event.startDate
        const reminderDate = new Date(event.reminderTime)

        // Always set hours and minutes from the reminder time
        hours = reminderDate.getHours().toString().padStart(2, "0")
        minutes = reminderDate.getMinutes().toString().padStart(2, "0")

        if (event.reminderTime === eventTime) {
          reminderType = "on-time"
          reminderValue = 0
        } else {
          const diff = eventTime - event.reminderTime

          if (diff > 0) {
            // Reminder is before event
            reminderType = "before"
            if (diff >= 24 * 60 * 60 * 1000) {
              reminderUnit = "days"
              reminderValue = Math.round(diff / (24 * 60 * 60 * 1000))
            } else if (diff >= 60 * 60 * 1000) {
              reminderUnit = "hours"
              reminderValue = Math.round(diff / (60 * 60 * 1000))
            } else {
              reminderUnit = "minutes"
              reminderValue = Math.round(diff / (60 * 1000))
            }
          } else {
            // Reminder is after event
            reminderType = "after"
            const absDiff = Math.abs(diff)
            if (absDiff >= 24 * 60 * 60 * 1000) {
              reminderUnit = "days"
              reminderValue = Math.round(absDiff / (24 * 60 * 60 * 1000))
            } else if (absDiff >= 60 * 60 * 1000) {
              reminderUnit = "hours"
              reminderValue = Math.round(absDiff / (60 * 60 * 1000))
            } else {
              reminderUnit = "minutes"
              reminderValue = Math.round(absDiff / (60 * 1000))
            }
          }
        }
      }

      setNewEvent({
        id: event.id,
        title: event.title,
        description: event.description || "",
        start: new Date(event.startDate).toISOString(),
        end: event.endDate ? new Date(event.endDate).toISOString() : "",
        allDay: event.isAllDay,
        reminderTime: event.reminderTime,
        reminderType,
        reminderValue,
        reminderUnit,
        color: event.color,
        tagId: event.tagId,
        customSoundUrl: null,
      })
      setReminderHours(hours)
      setReminderMinutes(minutes)
      setSelectedEventId(event.id)
      setIsEventDialogOpen(true)
    }
  }

  // Calculate reminder time based on settings
  const calculateReminderTime = (eventStart: number): number | null => {
    // If manual time is set, use that
    if (reminderHours && reminderMinutes) {
      const hours = Number.parseInt(reminderHours)
      const minutes = Number.parseInt(reminderMinutes)

      if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        const reminderDate = new Date(eventStart)
        reminderDate.setHours(hours, minutes, 0, 0)
        return reminderDate.getTime()
      }
    }

    // If "on-time" is selected, return the event start time
    if (newEvent.reminderType === "on-time") {
      return eventStart
    }

    if (!newEvent.reminderValue) return null

    let reminderTime: number

    if (newEvent.reminderType === "before") {
      if (newEvent.reminderUnit === "minutes") {
        reminderTime = eventStart - newEvent.reminderValue * 60 * 1000
      } else if (newEvent.reminderUnit === "hours") {
        reminderTime = eventStart - newEvent.reminderValue * 60 * 60 * 1000
      } else {
        // days
        reminderTime = eventStart - newEvent.reminderValue * 24 * 60 * 60 * 1000
      }
    } else {
      // after
      if (newEvent.reminderUnit === "minutes") {
        reminderTime = eventStart + newEvent.reminderValue * 60 * 1000
      } else if (newEvent.reminderUnit === "hours") {
        reminderTime = eventStart + newEvent.reminderValue * 60 * 60 * 1000
      } else {
        // days
        reminderTime = eventStart + newEvent.reminderValue * 24 * 60 * 60 * 1000
      }
    }

    return reminderTime
  }

  // Create or update an event
  const handleSaveEvent = () => {
    if (!newEvent.title.trim()) {
      toast.error("Event title is required")
      return
    }

    // Use the selected date for the event time
    const eventDate = new Date(selectedDate)
    // Set the time to current time if creating a new event
    if (!selectedEventId) {
      const now = new Date()
      eventDate.setHours(now.getHours(), now.getMinutes(), 0, 0)
    }

    const eventStart = eventDate.getTime()
    const reminderTime = calculateReminderTime(eventStart)

    let customSoundUrlToSave = null

    // If a new custom sound file is selected, use its object URL
    if (customSound) {
      customSoundUrlToSave = URL.createObjectURL(customSound)
    } else {
       // If no new file is selected, use the default sound from the public folder
       customSoundUrlToSave = "/notification-sound/notification-3-337821.mp3";
    }

    const eventData = {
      id: selectedEventId || Math.random().toString(36).substring(2, 15),
      title: newEvent.title,
      description: newEvent.description,
      startDate: eventStart,
      endDate: null, 
      isAllDay: false,
      reminderTime,
      color: newEvent.color,
      tagId: newEvent.tagId,
      customSoundUrl: customSoundUrlToSave,
    }

    const reminderTimeFormatted = reminderTime ? format(new Date(reminderTime), 'yyyy-MM-dd HH:mm') : 'No reminder set';

    if (selectedEventId) {
      // Update existing event
      updateEvent(selectedEventId, eventData);
      toast.info(`Event "${eventData.title}" updated. Reminder set for: ${reminderTimeFormatted}`, { duration: 60000 });
    } else {
      // Create new event
      addEvent(eventData);
      toast.success(`Event "${eventData.title}" added.`, { duration: 60000 });
    }

    // Reset form and close dialog
    resetEventForm()
    setIsEventDialogOpen(false)
  }

  // Delete an event
  const handleDeleteEvent = () => {
    if (selectedEventId) {
      deleteEvent(selectedEventId)
      toast.error("Event deleted")
      resetEventForm()
      setIsDeleteDialogOpen(false)
      setIsEventDialogOpen(false)
    }
  }

  // Reset the event form
  const resetEventForm = () => {
    setNewEvent({
      id: "",
      title: "",
      description: "",
      start: "",
      end: "",
      allDay: false,
      reminderTime: null,
      reminderType: "before",
      reminderValue: 15,
      reminderUnit: "minutes",
      color: "#3788d8",
      tagId: null,
      customSoundUrl: null,
    })
    setReminderHours("")
    setReminderMinutes("")
    setSelectedEventId(null)
    setCustomSound(null)
  }

  // Schedule notifications for reminders
  useEffect(() => {
    // Clear all existing notifications
      events.forEach((event) => {
      notificationService.clearNotification(event.id)
          })

    // Schedule new notifications
    events.forEach((event) => {
      if (event.reminderTime) {
        notificationService.scheduleNotification({
          id: event.id,
          title: event.title,
          reminderTime: event.reminderTime,
          customSoundUrl: event.customSoundUrl
        })
      }
    })
  }, [events])

  // Helper to determine event status
  const getEventStatus = (event: EventType) => {
    const now = Date.now();
    const start = event.startDate;
    const end = event.endDate;

    if (end && now > end) {
      return "completed";
    } else if (now >= start && (!end || now <= end)) {
      return "ongoing";
    } else {
      return "upcoming";
    }
  };

  // Helper to get status color class
  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-500';
      case 'ongoing':
        return 'bg-green-500';
      case 'completed':
        return 'bg-gray-500';
      default:
        return '';
    }
  };

  // Render the month view
  const renderMonthView = () => {
    const days = getDaysForMonthView()
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    return (
      <div className="h-full flex flex-col">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="text-center font-medium py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 flex-1">
          {days.map((day, index) => {
            const dayEvents = getEventsForDay(day)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isSelected = isSameDay(day, selectedDate)
            const isCurrentDay = isToday(day)

            return (
              <div
                key={index}
                className={`border rounded-md p-1 min-h-[100px] ${
                  isCurrentMonth ? "bg-white" : "bg-gray-50 text-gray-400"
                } ${isSelected ? "ring-2 ring-blue-500" : ""} ${
                  isCurrentDay ? "bg-blue-50" : ""
                } hover:bg-gray-50 cursor-pointer transition-colors`}
                onClick={() => handleDateClick(day)}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-sm ${isCurrentDay ? "font-bold text-blue-600" : ""}`}>{format(day, "d")}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      openNewEventDialog(day)
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <ScrollArea className="h-[80px]">
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      className="text-xs mb-1 p-1 rounded truncate flex items-center"
                      style={{ backgroundColor: event.color, color: "white" }}
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditEventDialog(event.id)
                      }}
                    >
                      {event.reminderTime && <Bell className="h-2 w-2 mr-1 flex-shrink-0" />}
                      <span className="truncate">
                        {event.isAllDay ? "All Day: " : ""}
                        {event.title}
                      </span>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Render the week view
  const renderWeekView = () => {
    const days = getDaysForWeekView()
    const hours = Array.from({ length: 24 }, (_, i) => i)

    return (
      <div className="h-full flex flex-col">
        <div className="grid grid-cols-8 gap-1 mb-2">
          <div className="text-center font-medium py-2"></div>
          {days.map((day, index) => (
            <div key={index} className="text-center font-medium py-2">
              <div>{format(day, "EEE")}</div>
              <div className={`text-sm ${isToday(day) ? "font-bold text-blue-600" : ""}`}>{format(day, "d")}</div>
            </div>
          ))}
        </div>
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-8 gap-1">
            {hours.map((hour) => (
              <React.Fragment key={hour}>
                <div className="text-right pr-2 text-xs text-gray-500 h-12 border-t">
                  {hour === 0 ? "00:00" : `${hour.toString().padStart(2, "0")}:00`}
                </div>
                {days.map((day, dayIndex) => {
                  const hourEvents = events.filter((event) => {
                    const eventDate = new Date(event.startDate)
                    return isSameDay(eventDate, day) && eventDate.getHours() === hour
                  })

                  return (
                    <div
                      key={dayIndex}
                      className="border-t h-12 relative"
                      onClick={() => {
                        const newDate = new Date(day)
                        newDate.setHours(hour)
                        openNewEventDialog(newDate)
                      }}
                    >
                      {hourEvents.map((event) => (
                        <div
                          key={event.id}
                          className="absolute inset-0 m-1 p-1 rounded text-xs text-white overflow-hidden flex items-center"
                          style={{ backgroundColor: event.color }}
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditEventDialog(event.id)
                          }}
                        >
                          {event.reminderTime && <Bell className="h-2 w-2 mr-1 flex-shrink-0" />}
                          <span className="truncate">{event.title}</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </ScrollArea>
      </div>
    )
  }

  // Render the day view
  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const dayEvents = getEventsForSelectedDate()

    return (
      <div className="h-full flex flex-col">
        <div className="text-center font-medium py-4">
          <div className="text-xl">{format(selectedDate, "EEEE")}</div>
          <div className={`text-lg ${isToday(selectedDate) ? "font-bold text-blue-600" : ""}`}>
            {format(selectedDate, "MMMM d, yyyy")}
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-1 gap-1">
            {hours.map((hour) => {
              const hourEvents = dayEvents.filter((event) => {
                const eventDate = new Date(event.startDate)
                return eventDate.getHours() === hour
              })

              return (
                <div key={hour} className="grid grid-cols-[80px_1fr] border-t">
                  <div className="text-right pr-4 py-2 text-sm text-gray-500">
                    {hour.toString().padStart(2, "0")}:00
                  </div>
                  <div
                    className="min-h-[60px] relative"
                    onClick={() => {
                      const newDate = new Date(selectedDate)
                      newDate.setHours(hour)
                      openNewEventDialog(newDate)
                    }}
                  >
                    {hourEvents.map((event) => (
                      <div
                        key={event.id}
                        className="absolute inset-x-0 m-1 p-2 rounded text-white"
                        style={{ backgroundColor: event.color }}
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditEventDialog(event.id)
                        }}
                      >
                        <div className="font-medium flex items-center">
                          {event.reminderTime && <Bell className="h-3 w-3 mr-1 flex-shrink-0" />}
                          {event.title}
                        </div>
                        {event.description && <div className="text-sm mt-1">{event.description}</div>}
                        {event.tagId && (
                          <div className="mt-1 flex items-center">
                            <TagIcon className="h-3 w-3 mr-1" />
                            {/* {tags.find((t) => t.id === event.tagId)?.name} */}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>
    )
  }

  // Render the list view
  const renderListView = () => {
    const monthEvents = getEventsForMonth()

    // Group events by date
    const eventsByDate: Record<string, EventType[]> = {};

    monthEvents.forEach((event) => {
      const dateKey = format(new Date(event.startDate), "yyyy-MM-dd")
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = []
      }
      eventsByDate[dateKey].push(event)
    })

    // Sort dates
    const sortedDates = Object.keys(eventsByDate).sort()

    return (
      <div className="h-full flex flex-col">
        <div className="text-center font-medium py-4">
          <div className="text-xl">
            {format(currentDate, "MMMM yyyy")}
          </div>
          <div className="text-sm text-gray-500">Events List</div>
        </div>
        <ScrollArea className="flex-1">
          {sortedDates.length > 0 ? (
            <div className="space-y-4 p-2">
              {sortedDates.map((dateKey) => {
                const date = parseISO(dateKey)
                return (
                  <div key={dateKey} className="border rounded-md overflow-hidden">
                    <div className={`p-2 font-medium ${isToday(date) ? "bg-blue-100" : "bg-gray-100"}`}>
                      {format(date, "EEEE, MMMM d, yyyy")}
                    </div>
                    <div className="divide-y">
                      {eventsByDate[dateKey].map((event) => {
                        const status = getEventStatus(event);
                        return (
                          <div
                            key={event.id}
                            className="flex items-center justify-between mb-2 p-3 border rounded-md shadow-sm"
                            onClick={() => openEditEventDialog(event.id)}
                          >
                            <div className="flex-1 mr-4">
                              <div className="font-medium flex items-center">
                                {event.reminderTime && <Bell className="h-4 w-4 mr-2 text-blue-500 flex-shrink-0" />}
                                {event.title}
                                {/* Add status label */}
                                <span
                                  className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-semibold text-white ${
                                    getStatusColorClass(status)
                                  }`}
                                >
                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 text-xs">
                              {/* Action buttons */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEditEventDialog(event.id)
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-red-500"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedEventId(event.id)
                                  setIsDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No events for this month
            </div>
          )}
        </ScrollArea>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Calendar Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="p-4 flex justify-between items-center border-b">
           <div className="flex items-center gap-2">
             <div className="flex border rounded-md overflow-hidden">
               <Button variant="ghost" size="sm" onClick={goToPrevious} className="rounded-none border-r">
                 <ChevronLeft className="h-4 w-4" />
               </Button>
               <Button variant="ghost" size="sm" onClick={goToNext} className="rounded-none">
                 <ChevronRight className="h-4 w-4" />
               </Button>
             </div>
             <Button variant="outline" onClick={goToToday}>
               today
             </Button>
             <h2 className="text-xl font-medium ml-4">
               {currentView === "day" ? format(selectedDate, "MMMM d, yyyy") : format(currentDate, "MMMM yyyy")}
             </h2>
           </div>
           <div className="flex items-center gap-2">
             <Button variant={currentView === "month" ? "secondary" : "outline"} onClick={() => setCurrentView("month")}>
               month
             </Button>
             <Button variant={currentView === "week" ? "secondary" : "outline"} onClick={() => setCurrentView("week")}>
               week
             </Button>
             <Button variant={currentView === "day" ? "secondary" : "outline"} onClick={() => setCurrentView("day")}>
               day
             </Button>
             <Button variant={currentView === "list" ? "secondary" : "outline"} onClick={() => setCurrentView("list")}>
               list
             </Button>
             <Button
               onClick={() => {
                 setNewEvent({
                   id: "",
                   title: "",
                   description: "",
                   start: new Date().toISOString(),
                   end: "",
                   allDay: false,
                   reminderTime: null,
                   reminderType: "before",
                   reminderValue: 15,
                   reminderUnit: "minutes",
                   color: "#3788d8",
                   tagId: null,
                   customSoundUrl: null, // Ensure this is null for new events
                 })
                 setReminderHours("")
                 setReminderMinutes("")
                 setIsEventDialogOpen(true)
               }}
             >
               <Plus className="h-4 w-4 mr-2" /> Add Event
             </Button>
           </div>
         </div>
        {currentView === "month" && renderMonthView()}
        {currentView === "week" && renderWeekView()}
        {currentView === "day" && renderDayView()}
        {currentView === "list" && renderListView()}
      </div>

      {/* Event List Sidebar */}
      <motion.div
        className="w-80 border-l bg-gray-50 flex flex-col"
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">All Events</h3>
        </div>
        <ScrollArea className="flex-1 p-4">
          {events.length > 0 ? (
            events.map((event) => (
              <div key={event.id} className="mb-4 p-3 border rounded-lg bg-white shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-base">{event.title}</h4>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditEventDialog(event.id)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => {
                       setSelectedEventId(event.id);
                       setIsDeleteDialogOpen(true);
                    }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{format(new Date(event.startDate), 'PPP p')}</p>
                {/* Add other event details as needed */}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          )}
        </ScrollArea>
      </motion.div>

      {/* Event Dialog */}
      <Dialog
        open={isEventDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetEventForm();
          setIsEventDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-6">
          <DialogHeader className="mb-4">
            <DialogTitle>{selectedEventId ? "Edit Event" : "Create New Event"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="space-y-6 pb-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Event title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                />
              </div>

              {/* Add Status Display */}
              {selectedEventId && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center pt-1">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold text-white ${
                        getStatusColorClass(getEventStatus(events.find(e => e.id === selectedEventId)!))
                      }`}
                    >
                      {getEventStatus(events.find(e => e.id === selectedEventId)!).charAt(0).toUpperCase() + 
                       getEventStatus(events.find(e => e.id === selectedEventId)!).slice(1)}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Event description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="h-20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {["#3788d8", "#f44336", "#4CAF50", "#FF9800", "#9C27B0", "#795548"].map((color) => (
                    <div
                      key={color}
                      className={`w-8 h-8 rounded-full cursor-pointer border-2 ${
                        newEvent.color === color ? "border-black" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewEvent({ ...newEvent, color })}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder">Set reminder</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select
                    value={newEvent.reminderType}
                    onValueChange={(value: "before" | "after" | "on-time") =>
                      setNewEvent({ ...newEvent, reminderType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="before">Before</SelectItem>
                      <SelectItem value="on-time">On time</SelectItem>
                      <SelectItem value="after">After</SelectItem>
                    </SelectContent>
                  </Select>

                  {newEvent.reminderType !== "on-time" && (
                    <>
                      <Input
                        type="number"
                        min="1"
                        value={newEvent.reminderValue}
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            reminderValue: Number.parseInt(e.target.value) || 15,
                          })
                        }
                      />

                      <Select
                        value={newEvent.reminderUnit}
                        onValueChange={(value: "minutes" | "hours" | "days") =>
                          setNewEvent({ ...newEvent, reminderUnit: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">Minutes</SelectItem>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="days">Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  <Label htmlFor="manual-time">Manual time (24-hour format)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="hours"
                      type="text"
                      placeholder="15"
                      className="w-16 text-center"
                      maxLength={2}
                      value={reminderHours}
                      onChange={(e) => {
                        const hours = e.target.value.replace(/[^0-9]/g, "");
                        if (hours === "" || (Number.parseInt(hours) >= 0 && Number.parseInt(hours) <= 23)) {
                          setReminderHours(hours);
                        }
                      }}
                    />
                    <span className="mx-2 text-gray-500">:</span>
                    <Input
                      id="minutes"
                      type="text"
                      placeholder="10"
                      className="w-16 text-center"
                      maxLength={2}
                      value={reminderMinutes}
                      onChange={(e) => {
                        const minutes = e.target.value.replace(/[^0-9]/g, "");
                        if (minutes === "" || (Number.parseInt(minutes) >= 0 && Number.parseInt(minutes) <= 59)) {
                          setReminderMinutes(minutes);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Reminder Info Messages */}
                {(reminderHours || reminderMinutes) && (
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Reminder will be set at exactly {reminderHours}:{reminderMinutes}
                  </div>
                )}

                {!reminderHours &&
                  !reminderMinutes &&
                  newEvent.reminderValue > 0 &&
                  newEvent.reminderType !== "on-time" && (
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Reminder will be set for {newEvent.reminderValue} {newEvent.reminderUnit} {newEvent.reminderType}{" "}
                      the event
                    </div>
                  )}

                {!reminderHours && !reminderMinutes && newEvent.reminderType === "on-time" && (
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Reminder will be set exactly at the event time
                  </div>
                )}
              </div>

              {/* Add Custom Notification Sound section */}
              <div className="space-y-2">
                <Label htmlFor="custom-sound">Custom Notification Sound</Label>
                <div className="flex items-center space-x-2 pt-1">
                  <Input
                    id="custom-sound"
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setCustomSound(e.target.files ? e.target.files[0] : null)}
                    className="flex-1"
                  />
                  {customSound && (
                    <span>{customSound.name}</span>
                  )}
                </div>
                {/* Removed display of existing sound URL */} 
                {/* Optional: Add a play button for the selected or existing sound */} 
                {/* <Button variant="outline" size="sm" onClick={() => playSound(customSound || customSoundUrl)}>Play</Button> */} 
              </div>
              {/* End Custom Notification Sound section */}
            </div>
          </ScrollArea>
          <DialogFooter className="flex justify-between items-center mt-6">
            <div>
              {selectedEventId && (
                <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} className="rounded-md">
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  resetEventForm();
                  setIsEventDialogOpen(false);
                }}
                className="rounded-md"
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEvent} className="rounded-md">{selectedEventId ? "Update" : "Create"}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the event.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
