import { adminDb } from "@/lib/firebase-admin";

// Initialize services collection with booking fees
const servicesData = {
  electrician: {
    name: "Electrician",
    bookingFee: 25,
    servicePrice: 450, // Base hourly rate
    commissionPercent: 15,
  },
  plumber: {
    name: "Plumber",
    bookingFee: 25,
    servicePrice: 350,
    commissionPercent: 15,
  },
  cleaner: {
    name: "Deep Cleaning",
    bookingFee: 25,
    servicePrice: 300,
    commissionPercent: 15,
  },
  carpenter: {
    name: "Carpenter",
    bookingFee: 25,
    servicePrice: 400,
    commissionPercent: 15,
  },
  appliance_repair: {
    name: "Appliance Repair",
    bookingFee: 25,
    servicePrice: 500,
    commissionPercent: 15,
  },
};

export async function initializeServices() {
  const batch = adminDb.batch();

  for (const [serviceId, serviceData] of Object.entries(servicesData)) {
    const serviceRef = adminDb.collection("services").doc(serviceId);
    batch.set(serviceRef, {
      ...serviceData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await batch.commit();
  console.log("Services collection initialized");
}