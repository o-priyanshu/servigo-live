/**
 * @file services/firebase/workerPortal.ts
 * Compatibility layer for older provider-portal imports.
 */

import {
  getWorkerProfile,
  registerWorker,
  updateWorkerProfile,
  uploadWorkerDocument,
} from "@/services/firebase/workerAuth";
import {
  subscribeToPendingJobs as subscribeToPendingJobsService,
  updateJobStatus,
} from "@/services/firebase/workerJobs";
import { getWorkerNotifications, subscribeToWorkerNotifications as subscribeToWorkerNotificationsService } from "@/services/firebase/workerNotification";
import { requestWithdrawal as requestWithdrawalService } from "@/services/firebase/workerEarnings";
import type {
  JobRequest,
  WorkerJob,
  WorkerNotification,
  WorkerProfile,
} from "@/services/firebase/types";

export const createProviderProfile = async (
  uid: string,
  profile: Omit<WorkerProfile, "uid" | "createdAt" | "updatedAt">
): Promise<void> => {
  await registerWorker({
    uid,
    name: profile.name,
    phone: profile.phone,
    email: profile.email,
    gender: profile.gender,
    dateOfBirth: profile.dateOfBirth,
    address: profile.address,
    serviceRadius: profile.serviceRadius,
    serviceablePincodes: profile.serviceablePincodes,
    skills: profile.skills,
    languages: profile.languages,
    tools: profile.tools,
    bankDetails: profile.bankDetails,
    verificationData: {
      aadhaarNumber: profile.verificationData.aadhaarNumber,
      aadhaarFrontUrl: profile.verificationData.aadhaarFrontUrl,
      aadhaarBackUrl: profile.verificationData.aadhaarBackUrl,
      selfieUrl: profile.verificationData.selfieUrl,
      profilePhotoUrl: profile.verificationData.profilePhotoUrl,
      referenceName: profile.verificationData.referenceName,
      referencePhone: profile.verificationData.referencePhone,
    },
  });
};

export const getProviderProfile = getWorkerProfile;
export const updateProviderProfile = updateWorkerProfile;

export const uploadProviderDocument = async (
  uid: string,
  type: "aadhaar_front" | "aadhaar_back" | "selfie" | "profile_photo",
  file: File
): Promise<string> => uploadWorkerDocument(uid, type, file);

export const subscribeToPendingJobs = (
  workerId: string,
  callback: (jobs: JobRequest[]) => void
): (() => void) => subscribeToPendingJobsService(workerId, 0, 0, 1000, callback);

export const updateWorkerJobStatus = async (
  jobId: string,
  status: WorkerJob["status"],
  extra: Record<string, unknown> = {}
): Promise<void> => updateJobStatus(jobId, status, extra);

export const createWithdrawalRequest = async (
  workerId: string,
  _workerName: string,
  amount: number,
  method: "bank" | "upi",
  _bankDetails: unknown
): Promise<void> => requestWithdrawalService(workerId, amount, method);

export const subscribeToWorkerNotifications = (
  workerId: string,
  callback: (notifications: WorkerNotification[]) => void
): (() => void) => {
  let rows: WorkerNotification[] = [];

  void getWorkerNotifications(workerId).then((items) => {
    rows = items;
    callback(rows);
  });

  return subscribeToWorkerNotificationsService(workerId, (notification) => {
    const exists = rows.find((item) => item.id === notification.id);
    rows = exists
      ? rows.map((item) => (item.id === notification.id ? notification : item))
      : [notification, ...rows];
    callback(rows);
  });
};

