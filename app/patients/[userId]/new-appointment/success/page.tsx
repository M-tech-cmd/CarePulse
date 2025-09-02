import Link from "next/link";
import Image from "next/image";
import { captureException, captureMessage, setContext } from "@sentry/nextjs";

import { Doctors } from "@/constants";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/actions/patient.actions";
import { getAppointment } from "@/lib/actions/appointment.actions";

// Define interfaces based on expected data structure
interface User {
  $id: string;
  name: string;
  // Add other fields as needed
}

interface Appointment {
  $id: string;
  primaryPhysician: string;
  schedule: string;
  // Add other fields as needed
}

interface Doctor {
  name: string;
  image: string;
  // Add other fields as needed
}

interface SearchParamProps {
  params: Promise<{ userId: string }>; // params as Promise
  searchParams: Promise<{ appointmentId?: string }>; // searchParams as Promise
}

const RequestSuccess = async ({ params, searchParams }: SearchParamProps) => {
  const { userId } = await params; // Await params to resolve userId
  const searchParamsData = await searchParams; // Await searchParams to resolve appointmentId
  const appointmentId = (searchParamsData?.appointmentId as string) || "";

  let user: User | undefined;
  let appointment: Appointment | undefined;
  let doctor: Doctor | undefined;

  try {
    user = await getUser(userId);

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    if (!appointmentId) {
      throw new Error("No appointmentId provided in search parameters");
    }

    appointment = await getAppointment(appointmentId);

    if (!appointment) {
      throw new Error(`Appointment with ID ${appointmentId} not found`);
    }

    doctor = Doctors.find((doc) => doc.name === appointment.primaryPhysician);

    if (!doctor) {
      throw new Error(`Doctor ${appointment.primaryPhysician} not found`);
    }

    // Sentry tracking with setContext instead of metrics
    if (user.name) {
      setContext("user_view", {
        event: "appointment-success",
        userId,
        userName: user.name,
      });
    } else {
      captureMessage(`User ${userId} has no name for tracking`, "warning");
    }
  } catch (error) {
    console.error("Error in RequestSuccess page:", error);
    Sentry.captureException(error, { extra: { userId, appointmentId } });
    return (
      <div className="flex items-center justify-center h-screen text-red-500">
        ⚠️ Error loading request success page. Please try again or contact support.
      </div>
    );
  }

  return (
    <div className="flex h-screen max-h-screen px-[5%]">
      <div className="success-img">
        <Link href="/">
          <Image
            src="/assets/icons/logo-full.svg"
            height={1000}
            width={1000}
            alt="logo"
            className="h-10 w-fit"
          />
        </Link>

        <section className="flex flex-col items-center">
          <Image
            src="/assets/gifs/success.gif"
            height={300}
            width={280}
            alt="success"
          />
          <h2 className="header mb-6 max-w-[600px] text-center">
            Your <span className="text-green-500">appointment request</span> has
            been successfully submitted!
          </h2>
          <p>We&apos;ll be in touch shortly to confirm.</p>
        </section>

        <section className="request-details">
          <p>Requested appointment details: </p>
          <div className="flex items-center gap-3">
            <Image
              src={doctor?.image!}
              alt="doctor"
              width={100}
              height={100}
              className="size-12"
            />
            <p className="whitespace-nowrap">Dr. {doctor?.name}</p>
          </div>
          <div className="flex gap-2">
            <Image
              src="/assets/icons/calendar.svg"
              height={24}
              width={24}
              alt="calendar"
            />
            <p>{formatDateTime(appointment.schedule).dateTime}</p>
          </div>
        </section>

        <Button variant="outline" className="shad-primary-btn" asChild>
          <Link href={`/patients/${userId}/new-appointment`}>
            New Appointment
          </Link>
        </Button>

        <p className="copyright">© {new Date().getFullYear()} CarePulse</p>
      </div>
    </div>
  );
};

export default RequestSuccess;