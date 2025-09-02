import Image from "next/image";
import * as Sentry from "@sentry/nextjs";

import { getPatient } from "@/lib/actions/patient.actions";
import AppointmentForm from "@/components/forms/AppointmentForm";

// Define the props interface for the dynamic route
interface SearchParamProps {
  params: Promise<{ userId: string }>; // params as Promise
}

export default async function NewAppointment({ params }: SearchParamProps) {
  const { userId } = await params; // Await params to resolve userId

  let patient;

  try {
    patient = await getPatient(userId);

    if (!patient) {
      throw new Error(`Patient with ID ${userId} not found`);
    }

    // Sentry metrics with safety check
    if (Sentry?.metrics && patient.name) {
      Sentry.metrics.set("user_view_new-appointment", patient.name);
    } else {
      Sentry.captureMessage(`Patient ${userId} has no name for metrics`, "warning");
    }
  } catch (error) {
    console.error("Error fetching patient in NewAppointment page:", error);
    Sentry.captureException(error, { extra: { userId } });
    return (
      <div className="flex items-center justify-center h-screen text-red-500">
        ⚠️ Error loading appointment page. Please try again or contact support.
      </div>
    );
  }

  return (
    <div className="flex h-screen max-h-screen">
      <section className="remove-scrollbar container my-auto">
        <div className="sub-container max-w-[860px] flex-1 justify-between">
          <Image
            src="/assets/icons/logo-full.svg"
            width={1000}
            height={1000}
            alt="logo"
            className="mb-12 h-10 w-fit"
          />

          <AppointmentForm
            type="create"
            userId={userId}
            patientId={patient.$id}
          />

          <p className="copyright mt-10 py-12">© {new Date().getFullYear()} CarePulse</p> {/* Updated to dynamic year */}
        </div>
      </section>

      <Image
        src="/assets/images/appointment-img.png"
        width={1000}
        height={1000}
        alt="appointment"
        className="side-img max-w-[390px] bg-bottom"
      />
    </div>
  );
}