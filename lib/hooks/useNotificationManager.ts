import { useState, useEffect, useCallback } from 'react';
import { useDeadlineNotifications } from './useDeadlineNotifications';
import { MobileNotificationService } from '@/lib/mobile-notification-service';
import { isDemoMode } from '@/lib/demo/config';

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

interface UseNotificationManager {
  // Popup state
  showPopup: boolean;
  setShowPopup: (show: boolean) => void;
  
  // Notification data
  upcomingTasks: TaskDeadline[];
  isLoading: boolean;
  
  // Actions
  checkDeadlines: () => Promise<void>;
  dismissPopup: () => void;
  handleTaskClick: (taskId: string) => void;
  
  // Mobile compatibility
  isMobileCompatible: boolean;
  requestMobilePermission: () => Promise<boolean>;
}

export const useNotificationManager = (): UseNotificationManager => {
  const [showPopup, setShowPopup] = useState(false);
  const [isMobileCompatible, setIsMobileCompatible] = useState(isDemoMode);
  const [lastDismissTime, setLastDismissTime] = useState<number>(0);
  
  const { upcomingTasks, isLoading, checkDeadlines } = useDeadlineNotifications();

  // Check mobile compatibility
  useEffect(() => {
    if (isDemoMode) {
      return;
    }
    const checkMobileCompatibility = () => {
      if (typeof window === 'undefined') return false;
      
      const userAgent = navigator.userAgent.toLowerCase();
      const isAndroid = /android/i.test(userAgent);
      const isIOS = /iphone|ipad|ipod/i.test(userAgent);
      const isChrome = /chrome/i.test(userAgent) && !/edg/i.test(userAgent);
      const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
      const supportsNotifications = 'Notification' in window;
      
      const compatible = supportsNotifications && isSecure && (
        (isAndroid && isChrome) || // Android Chrome
        isIOS || // iOS Safari/Chrome
        (!isAndroid && !isIOS) // Desktop browsers
      );
      
      console.log('📱 Mobile compatibility check:', {
        isAndroid,
        isIOS,
        isChrome,
        isSecure,
        supportsNotifications,
        compatible
      });
      
      setIsMobileCompatible(compatible);
      return compatible;
    };
    
    checkMobileCompatibility();
  }, []);

  // Show popup when there are new tasks (with throttling)
  useEffect(() => {
    // The public demo should open as a calm product walkthrough. Deadline
    // alerts remain available from the Notifications screen when requested.
    if (isDemoMode) return;

    if (upcomingTasks.length > 0) {
      const now = Date.now();
      const timeSinceLastDismiss = now - lastDismissTime;
      const minTimeBetweenPopups = 10 * 60 * 1000; // 10 minutes
      
      // Only show popup if enough time has passed since last dismissal
      if (timeSinceLastDismiss > minTimeBetweenPopups) {
        setShowPopup(true);
      } else {
        console.log(`⏱️ Popup throttled. Time since last dismiss: ${Math.round(timeSinceLastDismiss / 1000)}s`);
      }
    }
  }, [upcomingTasks.length, lastDismissTime]);

  const dismissPopup = useCallback(() => {
    setShowPopup(false);
    setLastDismissTime(Date.now());
    
    // Store dismissal time in localStorage for persistence across sessions
    localStorage.setItem('notificationDismissTime', Date.now().toString());
  }, []);

  // Load last dismiss time from localStorage
  useEffect(() => {
    const storedDismissTime = localStorage.getItem('notificationDismissTime');
    if (storedDismissTime) {
      setLastDismissTime(parseInt(storedDismissTime));
    }
  }, []);

  const handleTaskClick = useCallback((taskId: string) => {
    console.log('📱 Task clicked from notification:', taskId);
    
    // Close the popup
    dismissPopup();
    
    // Navigate to task (this would be handled by the parent component)
    // For now, just log the action
    console.log('Navigate to task:', taskId);
    
    // You could emit a custom event or use a callback prop here
    window.dispatchEvent(new CustomEvent('notification-task-click', { 
      detail: { taskId } 
    }));
  }, [dismissPopup]);

  const requestMobilePermission = useCallback(async (): Promise<boolean> => {
    if (isDemoMode) return true;
    try {
      const mobileService = MobileNotificationService.getInstance();
      const granted = await mobileService.requestPermission();
      
      if (granted) {
        console.log('✅ Mobile notification permission granted');
      } else {
        console.log('❌ Mobile notification permission denied');
      }
      
      return granted;
    } catch (error) {
      console.error('❌ Error requesting mobile notification permission:', error);
      return false;
    }
  }, []);

  return {
    showPopup,
    setShowPopup,
    upcomingTasks,
    isLoading,
    checkDeadlines,
    dismissPopup,
    handleTaskClick,
    isMobileCompatible,
    requestMobilePermission
  };
};
