/**
 * Utility functions for formatting data in the application
 */

/**
 * Formats an enrollment status into a more readable form
 * @param status The enrollment status from the API
 * @returns A user-friendly formatted status string
 */
export const formatEnrollmentStatus = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return 'Pending Approval';
    case 'pending_hod_approval':
      return 'Pending Approval';
    case 'pending_office_approval':
      return 'Pending Approval';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'draft':
      return 'Draft';
    case 'submitted':
      return 'Submitted';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status ? capitalize(status.replace(/_/g, ' ')) : 'Unknown';
  }
};

/**
 * Formats a date string into a readable format
 * @param dateString ISO date string
 * @returns Formatted date string
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

/**
 * Formats a credit value with appropriate suffix
 * @param credits Number of credits
 * @returns Formatted credit string
 */
export const formatCredits = (credits: number): string => {
  return `${credits} Credit${credits === 1 ? '' : 's'}`;
};

/**
 * Capitalizes the first letter of a string
 * @param str String to capitalize
 * @returns Capitalized string
 */
export const capitalize = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};