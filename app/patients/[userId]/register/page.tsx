import Image from "next/image";
import * as Sentry from "@sentry/nextjs";

import { getUser } from "@/lib/actions/patient.actions";
import RegisterForm from "@/components/forms/RegisterForm";

// Define the props interface for the dynamic route
interface SearchParamProps {
  params: Promise<{ userId: string }>; // as Promise
}

const Register = async ({ params }: SearchParamProps) => {
  // Start a transaction for the whole page render
  const pageTransaction = Sentry.startTransaction({
    name: "Register Page Load",
    op: "page-load",
  });

  const { userId } = await params;
  let user;

  try {
    console.log("Fetching user with userId:", userId);

    // 🔹 Start a span for DB fetch performance
    const fetchUserSpan = pageTransaction.startChild({
      op: "db",
      description: "getUser()",
    });

    user = await getUser(userId);

    fetchUserSpan.finish(); // ✅ Stop measuring DB fetch

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Custom metrics tracking for viewing register page
    if (user.name) {
      const span = pageTransaction.startChild({
        op: "metrics",
        description: "user_view_register",
      });

      span.setTag("event", "register-view");
      span.setData("user", user.name);

      // Record a measurement (like incrementing a counter)
      pageTransaction.setMeasurement("user_view_count", 1);

      span.finish();
    } else {
      Sentry.captureMessage(
        `User ${userId} has no name for metrics`,
        "warning"
      );
    }
  } catch (error) {
    console.error("Error fetching user in Register page:", error);
    Sentry.captureException(error, { extra: { userId } });

    pageTransaction.setStatus("internal_error");
    pageTransaction.finish();

    return (
      <div className="flex items-center justify-center h-screen text-red-500">
        Error loading registration. Please try again or contact support.
      </div>
    );
  }

  // Finish the page load transaction successfully
  pageTransaction.setStatus("ok");
  pageTransaction.finish();

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

          <p className="copyright py-12">
            © {new Date().getFullYear()} CarePulse
          </p>
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
