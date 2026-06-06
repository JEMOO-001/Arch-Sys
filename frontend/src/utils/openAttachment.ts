import { API_BASE } from '../config';

export const openAttachment = (attachmentPath: string) => {
  const url = `${API_BASE}${attachmentPath}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};
