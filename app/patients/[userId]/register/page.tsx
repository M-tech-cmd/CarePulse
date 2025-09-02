import Image from "next/image";
import * as Sentry from "@sentry/nextjs";

import { getUser } from "@/lib/actions/patient.actions";
import RegisterForm from "@/components/forms/RegisterForm";

// Define the props interface for the dynamic route
interface SearchParamProps {
  params: Promise<{ userId: string }>; // params as Promise
}

const Register = async ({ params }: SearchParamProps) => {
  const { userId } = await params; // Await params to resolve userId

  let user;

  try {
    console.log("Fetching user with userId:", userId); // Debug log
    user = await getUser(userId);

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Fixed Sentry metrics call
    if (Sentry?.metrics && user.name) {
      try {
        Sentry.metrics.increment("user_view_register", 1, {
          tags: { user: user.name }
        });
      } catch (sentryError) {
        console.warn('Sentry metrics failed:', sentryError);
      }
    } else {
      Sentry.captureMessage(`User ${userId} has no name for metrics`, "warning");
    }
  } catch (error) {
    console.error("Error fetching user in Register page:", error);
    Sentry.captureException(error, { extra: { userId } });
    return (
      <div className="flex items-center justify-center h-screen text-red-500">
        Error loading registration. Please try again or contact support.
      </div>
    );
  }

  return (
    <div className="flex h-screen max-h-screen">
      <section className="remove-scrollbar container">
        <div className="sub-container max-w-[860px] flex-a flex-col py-10">
          <Image
            src="/assets/icons/logo-full.svg"
            width={1000}
            height={1000}
            alt="logo"
            className="mb-12 h-10 w-fit"
          />

          <RegisterForm user={user} />

          <p className="copyright py-12">© {new Date().getFullYear()} CarePulse</p>
        </div>
      </section>

      <Image
        src="/assets/images/register-img.png"
        width={1000}
        height={1000}
        alt="patient"
        className="side-img max-w-[390px]"
      />
    </div>
  );
};

export default Register;