import type { Metadata } from "next";
import Footer from "@/components/Footer";
import "./privacy.css";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Nepal in 10 collects from visitors, why, and how to have it removed.",
};

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <div className="privacy-content">
        <h1>Privacy Policy</h1>
        <p className="privacy-updated">Last updated: October 26, 2026</p>

        <p>
          Nepal in 10 is a personal project by Ebb&amp;Flo documenting Rahul
          Sharma&rsquo;s run across Nepal. This page explains, plainly, what
          we collect from visitors and what happens to it.
        </p>

        <h2>If you subscribe to email updates</h2>
        <p>
          We collect your email address and store it with Resend, the email
          service we use to send updates. We use it only to send you updates
          about the run, including a one-time email the moment the run
          actually starts. You can unsubscribe at any time using the link in
          any email we send, or by emailing us directly (see below) and
          asking to be removed.
        </p>

        <h2>If you use the Contact form</h2>
        <p>
          We collect your name, email address, and whatever message you
          write. This is sent directly to our own inbox as an email (via
          Resend) so we can reply to you. We don&rsquo;t store it in a
          database. Once it arrives as an email, that&rsquo;s the only place
          it lives.
        </p>

        {/* <h2>If you place an order</h2>
        <p>
          Checkout happens entirely on Stripe&rsquo;s own secure payment
          page, and we never see or store your card details. Stripe
          collects your email, shipping address, and payment information
          directly, to process and ship your order. We briefly check your
          order status with Stripe afterward to show you a confirmation, but
          we don&rsquo;t store any of it ourselves.
        </p> */}

        <h2>Standard technical data</h2>
        <p>
          Like virtually every website, our hosting providers (Vercel, for
          this website; Render, for the live run tracker) automatically log
          basic technical information, like IP addresses, as part of normal
          operation. We don&rsquo;t run any analytics or advertising trackers
          on this site, and there are no tracking cookies here.
        </p>

        <h2>Who we share information with</h2>
        <p>
          We don&rsquo;t sell or rent your information to anyone, ever. The
          only parties that see any of this are the services that make the
          site work:
        </p>
        <ul>
          <li>
            <strong>Resend</strong>: sends our emails and stores the
            subscriber list
          </li>
          <li>
            <strong>Stripe</strong>: processes payments, if and when the shop
            is active
          </li>
          <li>
            <strong>Vercel, Render, and Cloudflare</strong>: host the
            website, the live tracker, and our video and image files
          </li>
        </ul>
        <p>
          Each is a standard, reputable service provider with its own
          privacy practices; we only share what each one needs to do its
          specific job.
        </p>

        <h2>How long we keep it</h2>
        <p>
          Your email stays on the subscriber list until you unsubscribe or
          ask us to remove it. Contact form messages live as a regular email
          in our inbox, kept as long as any email would be. We don&rsquo;t
          keep order details ourselves at all. That lives with Stripe.
        </p>

        <h2>Your choices</h2>
        <p>You can, at any time:</p>
        <ul>
          <li>Unsubscribe from updates (link in every email, or just ask)</li>
          <li>Ask us to delete your information entirely</li>
          <li>Ask what information we have about you</li>
        </ul>
        <p>
          Email{" "}
          <a href="mailto:ebbnfloadmin@gmail.com">ebbnfloadmin@gmail.com</a>{" "}
          for any of this. A real person reads that inbox and will action
          it.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          If what we collect or how we use it changes, we&rsquo;ll update
          this page and change the date at the top.
        </p>
      </div>

      <div style={{ ["--scene-t" as string]: 1, ["--dusk-t" as string]: 1 }}>
        <Footer />
      </div>
    </main>
  );
}
