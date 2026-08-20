import { useMutation } from '@tanstack/react-query';

import { publicPost } from '../../lib/api';

export type EnquiryInput = {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
  requirement: { budgetRange: string; timeline: string; interest: string };
  relatedProjectId?: string;
  /** The honeypot, and how long the form was open. Both read by the server, neither stored as content. */
  website: string;
  submittedInMs: number;
};

/**
 * The one public write. No query is invalidated on success because nothing
 * public reads enquiries — the portal does, in WRM-063, behind auth.
 */
export function useSubmitEnquiry() {
  return useMutation({
    mutationFn: (input: EnquiryInput) => publicPost<{ received: boolean }>('/public/enquiries', input),
  });
}
