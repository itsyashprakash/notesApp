import { toast } from "sonner"

class NotificationService {
  private static instance: NotificationService
  private audioContext: AudioContext | null = null
  private scheduledNotifications: Map<string, NodeJS.Timeout> = new Map()

  private constructor() {
    // Initialize AudioContext
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  public scheduleNotification(event: {
    id: string
    title: string
    reminderTime: number
    customSoundUrl?: string | null
  }) {
    // Clear any existing notification for this event
    this.clearNotification(event.id)

    const now = Date.now()
    const timeUntilReminder = event.reminderTime - now

    // Only schedule if the reminder time is in the future
    if (timeUntilReminder > 0) {
      const timeoutId = setTimeout(() => {
        this.showNotification(event)
      }, timeUntilReminder)

      this.scheduledNotifications.set(event.id, timeoutId)
    }
  }

  public clearNotification(eventId: string) {
    const existingTimeout = this.scheduledNotifications.get(eventId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
      this.scheduledNotifications.delete(eventId)
    }
  }

  private async showNotification(event: {
    title: string
    customSoundUrl?: string | null
  }) {
    // Show toast notification
    toast("Reminder", {
      description: event.title,
      duration: 10000,
    })

    // Play sound only if customSoundUrl is provided
    if (event.customSoundUrl) {
      try {
        const soundUrl = event.customSoundUrl;
        const audio = new Audio(soundUrl);

        // Ensure audio context is running
        if (this.audioContext?.state === 'suspended') {
          await this.audioContext.resume();
        }

        await audio.play();
      } catch (error) {
        console.error("Failed to play custom notification sound:", error);
        // Do not fallback to default sound if custom sound fails
      }
    }
  }
}

export const notificationService = NotificationService.getInstance() 