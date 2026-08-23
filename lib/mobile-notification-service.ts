/**
 * Enhanced Mobile Notification Service
 * Optimized for Android Chrome and iPhone Chrome browsers
 * Handles cross-browser compatibility and mobile-specific features
 */

import { supabase } from '@/lib/supabase';

interface TaskDeadline {
  id: string;
  title: string;
  project_name: string;
  end_date: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  daysRemaining: number;
}

interface MobileBrowserInfo {
  isMobile: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isChrome: boolean;
  isSafari: boolean;
  isFirefox: boolean;
  supportsNotifications: boolean;
  supportsPush: boolean;
  supportsServiceWorker: boolean;
  isSecure: boolean;
  userAgent: string;
}

interface MobileNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  vibrate?: number[];
  silent?: boolean;
  data?: {
    taskId?: string;
    projectName?: string;
    daysRemaining?: string;
    type?: string;
    [key: string]: string | number | boolean | undefined;
  };
}

export class MobileNotificationService {
  private static instance: MobileNotificationService;
  private browserInfo: MobileBrowserInfo;
  private isInitialized = false;
  private notificationQueue: TaskDeadline[] = [];

  constructor() {
    this.browserInfo = this.detectMobileBrowser();
    this.initializeNotifications();
  }

  static getInstance(): MobileNotificationService {
    if (!MobileNotificationService.instance) {
      MobileNotificationService.instance = new MobileNotificationService();
    }
    return MobileNotificationService.instance;
  }

  /**
   * Detect mobile browser and capabilities
   */
  private detectMobileBrowser(): MobileBrowserInfo {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isAndroid: false,
        isIOS: false,
        isChrome: false,
        isSafari: false,
        isFirefox: false,
        supportsNotifications: false,
        supportsPush: false,
        supportsServiceWorker: false,
        isSecure: false,
        userAgent: ''
      };
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isAndroid = /android/i.test(userAgent);
    const isIOS = /iphone|ipad|ipod/i.test(userAgent);
    const isChrome = /chrome/i.test(userAgent) && !/edg/i.test(userAgent);
    const isSafari = /safari/i.test(userAgent) && !/chrome/i.test(userAgent);
    const isFirefox = /firefox/i.test(userAgent);
    const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';

    console.log('🔍 Mobile Browser Detection:', {
      userAgent,
      isMobile,
      isAndroid,
      isIOS,
      isChrome,
      isSafari,
      isFirefox,
      isSecure
    });

    return {
      isMobile,
      isAndroid,
      isIOS,
      isChrome,
      isSafari,
      isFirefox,
      supportsNotifications: 'Notification' in window,
      supportsPush: 'PushManager' in window && 'serviceWorker' in navigator,
      supportsServiceWorker: 'serviceWorker' in navigator,
      isSecure,
      userAgent
    };
  }

  /**
   * Initialize notification service for mobile browsers
   */
  private async initializeNotifications(): Promise<void> {
    try {
      console.log('📱 Initializing mobile notification service...');
      
      if (!this.browserInfo.supportsNotifications) {
        console.warn('❌ Notifications not supported in this browser');
        return;
      }

      if (!this.browserInfo.isSecure) {
        console.warn('❌ HTTPS required for notifications');
        return;
      }

      // Register service worker for enhanced mobile support
      if (this.browserInfo.supportsServiceWorker) {
        await this.registerMobileServiceWorker();
      }

      this.isInitialized = true;
      console.log('✅ Mobile notification service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize mobile notifications:', error);
    }
  }

  /**
   * Register service worker optimized for mobile
   */
  private async registerMobileServiceWorker(): Promise<void> {
    try {
      if ('serviceWorker' in navigator) {
        // Try to register our enhanced service worker first
        let registration;
        try {
          registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          });
          console.log('✅ Enhanced mobile service worker registered:', registration);
        } catch (error) {
          console.warn('⚠️ Enhanced service worker failed, trying Firebase fallback:', error);
          // Fallback to Firebase service worker
          registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('✅ Firebase service worker registered as fallback:', registration);
        }
        
        // Listen for service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('📱 New service worker available, will update on next page load');
              }
            });
          }
        });
        
        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', (event) => {
          console.log('📱 Service worker message:', event.data);
        });
      }
    } catch (error) {
      console.error('❌ Service worker registration failed:', error);
    }
  }

  /**
   * Request notification permission with mobile-specific handling
   */
  async requestPermission(): Promise<boolean> {
    try {
      if (!this.browserInfo.supportsNotifications) {
        console.warn('❌ Notifications not supported');
        return false;
      }

      if (!this.browserInfo.isSecure) {
        console.warn('❌ HTTPS required for notifications - current protocol:', location.protocol);
        return false;
      }

      if (Notification.permission === 'granted') {
        console.log('✅ Notification permission already granted');
        return true;
      }

      if (Notification.permission === 'denied') {
        console.warn('❌ Notification permission denied - user must enable manually in browser settings');
        // For Android Chrome, provide specific instructions
        if (this.browserInfo.isAndroid && this.browserInfo.isChrome) {
          console.log('📱 Android Chrome: Go to Settings > Site Settings > Notifications to enable');
        }
        return false;
      }

      console.log('📱 Requesting notification permission for mobile browser...');
      
      // Enhanced mobile browser handling
      let permission: NotificationPermission;
      
      if (this.browserInfo.isMobile) {
        // For mobile browsers, ensure we're in a user gesture context
        if (this.browserInfo.isAndroid) {
          // Android-specific handling
          console.log('📱 Android browser detected - using enhanced permission request');
          
          // Add user-friendly prompt for Android
          const userConfirmed = confirm(
            'Relay would like to send you notifications about task deadlines. ' +
            'This will help you stay on top of important project milestones. Allow notifications?'
          );
          
          if (!userConfirmed) {
            console.log('📱 User declined notification prompt');
            return false;
          }
          
          // Request with retry logic for Android
          await new Promise(resolve => setTimeout(resolve, 200));
          permission = await Notification.requestPermission();
          
          // Android Chrome sometimes needs a second attempt
          if (permission === 'default') {
            console.log('📱 Android: First attempt returned default, retrying...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            permission = await Notification.requestPermission();
          }
        } else if (this.browserInfo.isIOS) {
          // iOS-specific handling
          console.log('📱 iOS browser detected - using iOS-optimized request');
          await new Promise(resolve => setTimeout(resolve, 100));
          permission = await Notification.requestPermission();
        } else {
          // General mobile handling
          await new Promise(resolve => setTimeout(resolve, 100));
          permission = await Notification.requestPermission();
        }
        
        // Additional mobile-specific retry logic
        if (permission === 'default') {
          console.log('📱 Permission dialog dismissed, trying again...');
          await new Promise(resolve => setTimeout(resolve, 500));
          permission = await Notification.requestPermission();
        }
      } else {
        permission = await Notification.requestPermission();
      }
      
      const granted = permission === 'granted';
      console.log(`📱 Permission result: ${permission} (granted: ${granted})`);
      
      if (!granted && this.browserInfo.isMobile) {
        if (this.browserInfo.isAndroid && this.browserInfo.isChrome) {
          console.log('📱 Android Chrome help: Check browser settings for notifications');
          console.log('📱 Path: Chrome Settings > Site Settings > Notifications > Allow');
        } else if (this.browserInfo.isIOS) {
          console.log('📱 iOS help: Check Safari settings and ensure notifications are enabled');
        }
      }
      
      return granted;
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      
      // Additional error context for mobile debugging
      if (this.browserInfo.isMobile) {
        console.log('📱 Mobile notification permission error details:', {
          userAgent: this.browserInfo.userAgent,
          isSecure: this.browserInfo.isSecure,
          supportsNotifications: this.browserInfo.supportsNotifications,
          currentPermission: typeof Notification !== 'undefined' ? Notification.permission : 'undefined'
        });
      }
      
      return false;
    }
  }

  /**
   * Send mobile-optimized notification
   */
  async sendMobileNotification(options: MobileNotificationOptions): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initializeNotifications();
      }

      if (Notification.permission !== 'granted') {
        console.warn('❌ Cannot send notification - permission not granted');
        return false;
      }

      // Mobile-optimized notification options
      const mobileOptions: NotificationOptions & { vibrate?: number[] } = {
        body: options.body,
        icon: options.icon || '/logo.svg',
        badge: options.badge || '/logo.svg',
        tag: options.tag || 'mobile-notification',
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        data: options.data || {},
      };

      // Add vibration for Android
      if (this.browserInfo.isAndroid && options.vibrate) {
        mobileOptions.vibrate = options.vibrate;
      }

      // Use service worker notification for better mobile support
      if (this.browserInfo.supportsServiceWorker) {
        return await this.sendServiceWorkerNotification(options.title, mobileOptions);
      } else {
        return await this.sendBasicNotification(options.title, mobileOptions);
      }
    } catch (error) {
      console.error('❌ Error sending mobile notification:', error);
      return false;
    }
  }

  /**
   * Send notification via service worker (better for mobile)
   */
  private async sendServiceWorkerNotification(title: string, options: NotificationOptions): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      console.log('✅ Service worker notification sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Service worker notification failed:', error);
      return false;
    }
  }

  /**
   * Send basic notification (fallback)
   */
  private async sendBasicNotification(title: string, options: NotificationOptions): Promise<boolean> {
    try {
      const notification = new Notification(title, options);
      
      notification.onclick = () => {
        console.log('📱 Mobile notification clicked');
        window.focus();
        notification.close();
      };

      notification.onshow = () => {
        console.log('✅ Mobile notification displayed');
      };

      notification.onerror = (error) => {
        console.error('❌ Mobile notification error:', error);
      };

      return true;
    } catch (error) {
      console.error('❌ Basic notification failed:', error);
      return false;
    }
  }

  /**
   * Check for task deadlines and send mobile notifications
   */
  async checkAndNotifyDeadlines(): Promise<TaskDeadline[]> {
    try {
      console.log('📱 Checking task deadlines for mobile notifications...');
      
      // Fetch tasks with upcoming deadlines
      const upcomingTasks = await this.fetchUpcomingTasks();
      
      if (upcomingTasks.length === 0) {
        console.log('✅ No upcoming task deadlines');
        return [];
      }

      console.log(`📱 Found ${upcomingTasks.length} tasks with upcoming deadlines`);

      // Send mobile notification for each task
      for (const task of upcomingTasks) {
        await this.sendTaskDeadlineNotification(task);
        
        // Add small delay between notifications to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return upcomingTasks;
    } catch (error) {
      console.error('❌ Error checking deadlines:', error);
      return [];
    }
  }

  /**
   * Fetch upcoming tasks from database
   */
  private async fetchUpcomingTasks(): Promise<TaskDeadline[]> {
    try {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          end_date,
          status,
          priority,
          assigned_to,
          projects!inner(name)
        `)
        .neq('status', 'completed')
        .not('end_date', 'is', null);

      if (error) {
        console.error('❌ Error fetching tasks:', error);
        return [];
      }

      if (!tasks || tasks.length === 0) {
        return [];
      }

      const now = new Date();
      const tasksWithDeadlines: TaskDeadline[] = [];

      tasks.forEach(task => {
        if (!task.end_date) return;

        const endDate = new Date(task.end_date);
        const timeDiff = endDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

        // Include tasks with 0-7 days remaining
        if (daysRemaining >= 0 && daysRemaining <= 7) {
          const taskDeadline = {
            id: task.id,
            title: task.title,
            project_name: (task.projects as { name: string })?.name || 'Unknown Project',
            end_date: task.end_date,
            status: task.status || 'unknown',
            priority: task.priority || 'medium',
            assigned_to: task.assigned_to,
            daysRemaining
          };
          
          tasksWithDeadlines.push(taskDeadline);
        }
      });

      return tasksWithDeadlines;
    } catch (error) {
      console.error('❌ Error fetching upcoming tasks:', error);
      return [];
    }
  }

  /**
   * Send task deadline notification optimized for mobile
   */
  async sendTaskDeadlineNotification(task: TaskDeadline): Promise<boolean> {
    try {
      const { title, project_name, daysRemaining, priority, status } = task;
      
      // Determine urgency and styling
      let urgencyText = '';
      let vibrationPattern: number[] = [200, 100, 200]; // Default pattern
      
      if (daysRemaining === 0) {
        urgencyText = '🚨 DUE TODAY';
        vibrationPattern = [300, 100, 300, 100, 300]; // Urgent pattern
      } else if (daysRemaining === 1) {
        urgencyText = '⚠️ 1 day remaining';
        vibrationPattern = [250, 100, 250]; // Warning pattern
      } else {
        urgencyText = `⏰ ${daysRemaining} days remaining`;
      }

      const notificationTitle = `${project_name} - Task Deadline`;
      const notificationBody = `${title}\n${urgencyText}\nStatus: ${status} | Priority: ${priority}`;

      console.log(`📱 Sending mobile notification for task: ${title}`);

      return await this.sendMobileNotification({
        title: notificationTitle,
        body: notificationBody,
        icon: '/logo.svg',
        badge: '/logo.svg',
        tag: `task-deadline-${task.id}`,
        requireInteraction: daysRemaining <= 1, // Keep urgent notifications on screen
        vibrate: vibrationPattern,
        data: {
          taskId: task.id,
          projectName: project_name,
          daysRemaining: daysRemaining.toString(),
          type: 'mobile_task_deadline'
        }
      });
    } catch (error) {
      console.error('❌ Error sending task deadline notification:', error);
      return false;
    }
  }

  /**
   * Test mobile notification with proper permission flow
   */
  async testMobileNotification(): Promise<boolean> {
    try {
      console.log('📱 Starting mobile notification test...');
      
      // First check if notifications are supported
      if (!this.browserInfo.supportsNotifications) {
        console.error('❌ Notifications not supported in this browser');
        throw new Error('Notifications not supported');
      }

      if (!this.browserInfo.isSecure) {
        console.error('❌ HTTPS required for notifications');
        throw new Error('HTTPS required for notifications');
      }

      // Request permission first
      console.log('📱 Requesting notification permission...');
      const hasPermission = await this.requestPermission();
      
      if (!hasPermission) {
        console.error('❌ Notification permission denied');
        throw new Error('Permission denied - please enable notifications in browser settings');
      }

      console.log('✅ Permission granted, sending test notification...');

      // Create test task
      const testTask: TaskDeadline = {
        id: 'mobile-test-1',
        title: 'Mobile Notification Test Task',
        project_name: 'Mobile Test Project',
        end_date: new Date().toISOString(),
        status: 'in-progress',
        priority: 'urgent',
        assigned_to: null,
        daysRemaining: 1
      };

      const result = await this.sendTaskDeadlineNotification(testTask);
      
      if (result) {
        console.log('✅ Mobile test notification sent successfully');
      } else {
        console.error('❌ Failed to send mobile test notification');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Mobile notification test failed:', error);
      throw error;
    }
  }

  /**
   * Get browser compatibility info
   */
  getBrowserInfo(): MobileBrowserInfo {
    return { ...this.browserInfo };
  }

  /**
   * Get mobile notification support status
   */
  getSupportStatus(): {
    isSupported: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!this.browserInfo.supportsNotifications) {
      issues.push('Browser does not support notifications');
    }

    if (!this.browserInfo.isSecure) {
      issues.push('HTTPS required for notifications');
      recommendations.push('Serve your site over HTTPS');
    }

    if (this.browserInfo.isIOS && this.browserInfo.isSafari) {
      issues.push('iOS Safari has limited notification support');
      recommendations.push('Use Chrome on iOS for better notification support');
    }

    if (!this.browserInfo.isChrome && this.browserInfo.isMobile) {
      recommendations.push('Chrome mobile provides the best notification experience');
    }

    if (!this.browserInfo.supportsServiceWorker) {
      issues.push('Service Worker not supported');
      recommendations.push('Update to a modern browser version');
    }

    return {
      isSupported: this.browserInfo.supportsNotifications && this.browserInfo.isSecure,
      issues,
      recommendations
    };
  }

  /**
   * Enable auto-check for deadlines
   */
  startAutoCheck(intervalMinutes: number = 30): void {
    console.log(`📱 Starting auto-check every ${intervalMinutes} minutes`);
    
    // Initial check
    this.checkAndNotifyDeadlines();
    
    // Set up periodic checks
    setInterval(() => {
      this.checkAndNotifyDeadlines();
    }, intervalMinutes * 60 * 1000);
  }
}

// Export singleton instance
export const mobileNotificationService = MobileNotificationService.getInstance();
export default mobileNotificationService;
