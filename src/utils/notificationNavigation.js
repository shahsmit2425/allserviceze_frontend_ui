const projectNotificationTypes = new Set([
  'new_bid',
  'bid_shortlisted',
  'bid_withdrawn',
  'project_awarded',
  'project_live',
  'project_approved',
  'project_rejected',
]);

const subscriptionNotificationTypes = new Set([
  'subscription_activated',
  'subscription_cancelled',
  'subscription_reactivated',
]);

export const getNotificationRoute = (notification) => {
  if (!notification?.type) {
    return null;
  }

  const data = notification.data && typeof notification.data === 'object'
    ? notification.data
    : {};

  if (notification.type === 'new_message') {
    const partnerId = data.sender_id || data.partner_id || data.user_id;
    return partnerId ? `/messages/${partnerId}` : '/messages';
  }

  if (notification.type === 'chat_message') {
    return '/messages';
  }

  if (notification.type === 'system_test') {
    return '/settings';
  }

  if (projectNotificationTypes.has(notification.type)) {
    const projectId = data.project_id || data.projectId;
    return projectId ? `/projects/${projectId}` : '/dashboard';
  }

  if (subscriptionNotificationTypes.has(notification.type)) {
    return '/subscription';
  }

  if (
    notification.type === 'portfolio_added'
    || notification.type === 'portfolio_updated'
    || notification.type === 'new_review'
  ) {
    return '/business-profile';
  }

  if (notification.type === 'verification_approved' || notification.type === 'account_rejected') {
    return '/dashboard';
  }

  return null;
};