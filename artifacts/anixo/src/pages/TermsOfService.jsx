import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Shield, FileText, Users, AlertTriangle, Scale, ChevronRight, Globe, Mail, Lock, Eye, Ban, RefreshCw, Gavel } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

export default function TermsOfService() {
  useEffect(() => {
    document.title = "Terms of Service | AniXo";
    window.scrollTo(0, 0);
  }, []);

  const sections = [
    {
      id: "acceptance",
      icon: FileText,
      title: "Acceptance of Terms",
      content: (
        <>
          <p>
            By accessing, browsing, or using the AniXo platform ("Service"), you acknowledge that you have read, understood,
            and agree to be bound by these Terms of Service ("Terms"), along with our Privacy Policy and DMCA Policy,
            which are incorporated herein by reference. These Terms constitute a legally binding agreement between you
            ("User," "you," or "your") and AniXo ("we," "us," or "our").
          </p>
          <p>
            If you do not agree to these Terms in their entirety, you must immediately discontinue use of the Service.
            Your continued use of AniXo following any modifications to these Terms constitutes your acceptance of such changes.
          </p>
          <p>
            We reserve the right to update, amend, or modify these Terms at any time without prior notice.
            It is your responsibility to review these Terms periodically. The "Last Updated" date at the top of this page
            indicates when these Terms were last revised.
          </p>
        </>
      ),
    },
    {
      id: "description",
      icon: Eye,
      title: "Description of Service",
      content: (
        <>
          <p>
            AniXo is a free-to-use, web-based platform that provides users with an organized index of anime content
            sourced from publicly available third-party providers. The Service functions solely as an aggregation
            and referral interface — it does not host, upload, store, cache, or distribute any video files, audio files,
            or copyrighted media on its own servers or infrastructure.
          </p>
          <p>
            All audiovisual content accessible through AniXo is embedded via third-party players and hosted on external servers
            operated by independent parties over whom AniXo exercises no ownership, control, or editorial oversight.
            AniXo acts exclusively as an intermediary providing navigational convenience and does not claim any rights
            to the content made accessible through its interface.
          </p>
          <p>
            The availability, quality, accuracy, and legality of content accessible through the Service is determined
            entirely by the respective third-party providers. AniXo makes no guarantees regarding the continued
            availability of any specific content or feature.
          </p>
        </>
      ),
    },
    {
      id: "eligibility",
      icon: Users,
      title: "User Eligibility",
      content: (
        <>
          <p>
            By using AniXo, you represent and warrant that you are at least thirteen (13) years of age,
            or the minimum age required by the laws of your jurisdiction to enter into a binding agreement.
            If you are under the age of eighteen (18), you may only use the Service under the supervision
            of a parent or legal guardian who agrees to be bound by these Terms.
          </p>
          <p>
            You further represent that you are not barred from using the Service under any applicable law
            and that you will comply with all local, state, national, and international laws and regulations
            applicable to your use of the Service.
          </p>
          <p>
            AniXo reserves the right to refuse service, terminate accounts, or restrict access to any user
            at its sole discretion, without obligation to provide a reason or prior notice.
          </p>
        </>
      ),
    },
    {
      id: "conduct",
      icon: Ban,
      title: "User Conduct & Acceptable Use",
      content: (
        <>
          <p>You agree to use AniXo solely for lawful purposes and in a manner consistent with these Terms. You agree not to:</p>
          <ol className="list-decimal list-inside space-y-2.5 text-white/40 mt-4">
            <li>
              <span className="text-white/50">Reproduce, distribute, or publicly display</span> any content from AniXo without prior written authorization.
            </li>
            <li>
              <span className="text-white/50">Attempt to circumvent, disable, or interfere</span> with any security features, access controls, or technical measures of the Service.
            </li>
            <li>
              <span className="text-white/50">Use automated systems</span> (including bots, scrapers, or crawlers) to access, extract, or collect data from the Service without express written permission.
            </li>
            <li>
              <span className="text-white/50">Transmit or upload</span> any material that contains viruses, malware, or other harmful code that may damage or interfere with the Service.
            </li>
            <li>
              <span className="text-white/50">Impersonate any person or entity</span>, or falsely state or misrepresent your affiliation with any person or entity.
            </li>
            <li>
              <span className="text-white/50">Use the Service for any commercial purpose</span> or for the benefit of any third party without our prior written consent.
            </li>
            <li>
              <span className="text-white/50">Engage in any activity</span> that could disable, overburden, or impair the proper functioning of the Service or its underlying infrastructure.
            </li>
          </ol>
          <p className="mt-4">
            AniXo reserves the right to investigate and take appropriate legal action against any user who violates these provisions,
            including, without limitation, terminating access and reporting such violations to relevant law enforcement authorities.
          </p>
        </>
      ),
    },
    {
      id: "intellectual-property",
      icon: Lock,
      title: "Intellectual Property Rights",
      content: (
        <>
          <p>
            The AniXo name, logo, user interface design, original graphics, and proprietary software code
            are the intellectual property of AniXo and are protected under applicable intellectual property laws.
            You may not reproduce, modify, distribute, or create derivative works from any proprietary AniXo materials
            without prior written authorization.
          </p>
          <p>
            All anime titles, character names, artwork, trademarks, and other media content accessible through AniXo
            are the property of their respective copyright holders and licensors. AniXo does not claim ownership
            of any third-party content made accessible through the Service.
          </p>
          <p>
            Nothing in these Terms grants you any right, title, or interest in the Service or its content
            beyond the limited right to use the Service in accordance with these Terms.
          </p>
        </>
      ),
    },
    {
      id: "third-party",
      icon: Globe,
      title: "Third-Party Content Disclaimer",
      content: (
        <>
          <p>
            AniXo does not host, control, verify, endorse, or assume responsibility for any content, products,
            or services provided by third-party sources accessible through the Service. All embedded media,
            streaming links, and external content are provided by independent third-party platforms.
            AniXo exercises no ownership, control, supervision, or editorial involvement over any third-party content.
          </p>
          <p>
            You acknowledge and agree that your access to and use of any third-party content through AniXo
            is entirely at your own risk. AniXo shall not be liable for any loss, damage, claim, or liability
            arising from your interaction with, reliance upon, or exposure to any third-party content,
            including but not limited to the accuracy, completeness, timeliness, legality, or quality thereof.
          </p>
          <p>
            AniXo does not make any representations or warranties regarding the legality of any third-party content
            accessible through the Service. Users are solely responsible for determining whether their use of any
            content complies with applicable laws in their respective jurisdictions.
          </p>
          <p>
            AniXo does not guarantee that any third-party content will be free from errors, inaccuracies,
            offensive material, or infringing content. Links to external websites and services do not constitute
            an endorsement or recommendation by AniXo of those resources or their operators.
          </p>
          <div className="mt-5 p-4 bg-red-500/5 border border-red-500/10 rounded-lg">
            <p className="text-[12px] text-red-400/60 font-normal flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>
                By using AniXo, you expressly acknowledge that any reliance on third-party content is solely at your own risk.
                AniXo disclaims all liability for any harm resulting from third-party content, services, or actions.
              </span>
            </p>
          </div>
        </>
      ),
    },
    {
      id: "dmca",
      icon: Shield,
      title: "DMCA Compliance",
      content: (
        <>
          <p>
            AniXo respects the intellectual property rights of others and operates in compliance with the
            Digital Millennium Copyright Act (DMCA), codified at Title 17, United States Code, Section 512.
            We respond promptly to valid copyright infringement notices submitted by copyright owners
            or their authorized representatives.
          </p>
          <p>
            If you believe that content accessible through AniXo infringes upon your copyright,
            please refer to our <Link to="/dmca" className="text-red-500/70 hover:text-red-400 transition">DMCA Policy</Link> page
            for detailed instructions on submitting a takedown notice, counter-notification, and other relevant procedures.
          </p>
          <p>
            In accordance with the DMCA, AniXo maintains a policy of terminating, in appropriate circumstances,
            the accounts or access privileges of users who are determined to be repeat infringers.
          </p>
        </>
      ),
    },
    {
      id: "responsibility",
      icon: Users,
      title: "User Responsibility",
      content: (
        <>
          <p>
            You are solely responsible for your use of the Service and for ensuring that your use complies
            with all applicable laws and regulations in your jurisdiction. AniXo does not monitor, control,
            or assume responsibility for how users interact with the Service or the content accessible through it.
          </p>
          <p>
            You agree to indemnify, defend, and hold harmless AniXo, its affiliates, officers, directors,
            agents, and employees from and against any and all claims, damages, obligations, losses, liabilities,
            costs, and expenses (including attorneys' fees) arising from or related to: (a) your use of the Service;
            (b) your violation of these Terms; (c) your violation of any third-party rights, including intellectual property rights;
            or (d) any claim that your use of the Service caused damage to a third party.
          </p>
          <p>
            This indemnification obligation shall survive the termination of these Terms and your use of the Service.
          </p>
        </>
      ),
    },
    {
      id: "liability",
      icon: Scale,
      title: "Limitation of Liability",
      content: (
        <>
          <p>
            To the fullest extent permitted by applicable law, AniXo, its affiliates, officers, directors,
            employees, agents, and licensors shall not be liable for any indirect, incidental, special,
            consequential, punitive, or exemplary damages — including, but not limited to, damages for loss of profits,
            goodwill, use, data, or other intangible losses — arising out of or in connection with your use of,
            or inability to use, the Service, regardless of the theory of liability (contract, tort, strict liability, or otherwise),
            even if AniXo has been advised of the possibility of such damages.
          </p>
          <p>
            In no event shall AniXo's total aggregate liability to you for all claims arising from or related to
            the Service exceed the amount you have paid to AniXo (if any) in the twelve (12) months preceding the claim,
            or one hundred U.S. dollars (USD $100.00), whichever is less.
          </p>
          <p>
            Some jurisdictions do not allow the exclusion or limitation of incidental or consequential damages.
            In such jurisdictions, AniXo's liability shall be limited to the maximum extent permitted by law.
          </p>
        </>
      ),
    },
    {
      id: "warranties",
      icon: AlertTriangle,
      title: "Disclaimer of Warranties",
      content: (
        <>
          <p>
            The Service is provided on an "AS IS" and "AS AVAILABLE" basis, without warranties of any kind,
            whether express, implied, or statutory. AniXo expressly disclaims all warranties, including but not limited to
            implied warranties of merchantability, fitness for a particular purpose, non-infringement,
            and any warranties arising from course of dealing, usage, or trade practice.
          </p>
          <p>
            AniXo does not warrant that: (a) the Service will be uninterrupted, timely, secure, or error-free;
            (b) the results obtained from the Service will be accurate, reliable, or complete;
            (c) the quality of any content, information, or material obtained through the Service will meet your expectations;
            or (d) any errors in the Service will be corrected.
          </p>
          <p>
            AniXo does not guarantee that the Service will be available at all times or free from interruptions,
            delays, outages, or technical failures. Service availability may be affected by maintenance,
            updates, third-party provider issues, or circumstances beyond AniXo's reasonable control.
          </p>
          <p>
            Nothing on the Service constitutes legal, financial, or professional advice of any kind.
            Any decisions made based on content or information accessed through AniXo are made at your sole discretion and risk.
          </p>
          <p>
            You expressly understand and agree that your use of the Service is at your sole risk.
            Any material accessed, downloaded, or otherwise obtained through the Service is done at your own discretion and risk.
          </p>
        </>
      ),
    },
    {
      id: "termination",
      icon: Ban,
      title: "Termination of Access",
      content: (
        <>
          <p>
            AniXo reserves the right, at its sole discretion and without prior notice or liability, to restrict,
            suspend, or terminate your access to all or any part of the Service for any reason,
            including but not limited to a breach of these Terms, suspected fraudulent or illegal activity,
            or extended periods of inactivity.
          </p>
          <p>
            Upon termination, your right to use the Service will immediately cease. All provisions of these Terms
            that by their nature should survive termination shall survive, including, without limitation,
            ownership provisions, warranty disclaimers, indemnification obligations, and limitations of liability.
          </p>
          <p>
            AniXo shall not be liable to you or any third party for any termination of your access to the Service.
          </p>
        </>
      ),
    },
    {
      id: "changes",
      icon: RefreshCw,
      title: "Changes to Terms",
      content: (
        <>
          <p>
            AniXo reserves the right to modify, amend, or replace these Terms at any time, at its sole discretion.
            Material changes will be indicated by updating the "Last Updated" date at the top of this page.
            What constitutes a material change will be determined at AniXo's sole discretion.
          </p>
          <p>
            Your continued use of the Service following the posting of revised Terms constitutes your acceptance of
            and agreement to be bound by the updated Terms. If you do not agree to the modified Terms,
            you must discontinue your use of the Service immediately.
          </p>
          <p>
            We encourage you to review these Terms periodically to remain informed of any updates.
            Your ongoing use of the Service represents your continued acceptance of these Terms.
          </p>
        </>
      ),
    },
    {
      id: "governing-law",
      icon: Gavel,
      title: "Governing Law & Dispute Resolution",
      content: (
        <>
          <p>
            These Terms shall be governed by and construed in accordance with applicable international and local laws,
            without regard to conflict of law principles. Jurisdiction and venue for any dispute, claim, or controversy
            arising out of or relating to these Terms or the use of the Service shall be determined based on applicable laws
            and the operational base of AniXo.
          </p>
          <p>
            Any dispute shall be resolved through binding arbitration or in the courts of competent jurisdiction,
            as determined by applicable law. You agree to submit to the personal jurisdiction of such courts
            and waive any objection to the convenience of such forum. Any claim or cause of action arising from
            or related to the use of the Service must be filed within one (1) year after such claim or cause of action arose,
            or be forever barred.
          </p>
          <p>
            If any provision of these Terms is found to be invalid or unenforceable by a court of competent jurisdiction,
            the remaining provisions shall continue in full force and effect. The failure of AniXo to enforce
            any right or provision of these Terms shall not constitute a waiver of such right or provision.
          </p>
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <main className="max-w-[900px] mx-auto px-4 md:px-8 pt-28">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 text-[11px] font-normal text-white/30 uppercase tracking-widest mb-6">
            <Link to="/home" className="hover:text-white transition">Home</Link>
            <ChevronRight size={12} />
            <span className="text-white/50">Terms of Service</span>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600/20 to-red-900/20 border border-red-500/10 flex items-center justify-center">
              <Scale size={24} className="text-red-500" />
            </div>
            <div>
              <h1 className="text-[28px] md:text-[36px] font-semibold tracking-tight leading-tight">
                Terms of Service
              </h1>
              <p className="text-[12px] text-white/30 font-normal mt-1">
                Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>

          <p className="text-[14px] text-white/40 leading-relaxed max-w-[700px] font-normal">
            Please read these Terms of Service carefully before using the AniXo platform. By accessing or using our Service,
            you agree to be bound by these Terms. If you do not agree with any part of these Terms, you may not access the Service.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="mb-12 p-5 bg-white/[0.02] border border-white/5 rounded-xl">
          <h2 className="text-[11px] font-medium uppercase tracking-widest text-white/40 mb-4">Table of Contents</h2>
          <nav className="space-y-2.5 columns-1 sm:columns-2">
            {sections.map((section, i) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center gap-3 text-[13px] font-normal text-white/35 hover:text-white/70 transition-all group break-inside-avoid"
              >
                <span className="text-[11px] font-mono text-white/15 group-hover:text-red-500/70 transition w-6">{String(i + 1).padStart(2, "0")}.</span>
                {section.title}
              </a>
            ))}
            <a href="#contact" className="flex items-center gap-3 text-[13px] font-normal text-white/35 hover:text-white/70 transition-all group break-inside-avoid">
              <span className="text-[11px] font-mono text-white/15 group-hover:text-red-500/70 transition w-6">{String(sections.length + 1).padStart(2, "0")}.</span>
              Contact Information
            </a>
          </nav>
        </div>

        {/* Sections */}
        <div className="space-y-14">
          {sections.map((section, i) => {
            const Icon = section.icon;
            return (
              <section key={section.id} id={section.id} className="scroll-mt-28">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-red-500/50" />
                  </div>
                  <h2 className="text-[18px] md:text-[22px] font-medium tracking-tight text-white/80">
                    <span className="text-white/15 font-mono text-[14px] mr-3">{String(i + 1).padStart(2, "0")}.</span>
                    {section.title}
                  </h2>
                </div>
                <div className="pl-11 space-y-4 text-[13px] md:text-[14px] text-white/40 leading-[1.85] font-normal">
                  {section.content}
                </div>
              </section>
            );
          })}

          {/* Contact Section */}
          <section id="contact" className="scroll-mt-28">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0">
                <Mail size={16} className="text-red-500/50" />
              </div>
              <h2 className="text-[18px] md:text-[22px] font-medium tracking-tight text-white/80">
                <span className="text-white/15 font-mono text-[14px] mr-3">{String(sections.length + 1).padStart(2, "0")}.</span>
                Contact Information
              </h2>
            </div>
            <div className="pl-11">
              <p className="text-[13px] md:text-[14px] text-white/40 leading-[1.85] font-normal mb-6">
                If you have any questions, concerns, or inquiries regarding these Terms of Service,
                please contact us through the following channels:
              </p>

              <div className="p-6 bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/5 rounded-xl space-y-4">
                <div className="flex items-center gap-3">
                  <Mail size={18} className="text-red-500/60" />
                  <div>
                    <p className="text-[10px] font-normal uppercase tracking-widest text-white/30 mb-1">General Inquiries</p>
                    <a href="mailto:contact@anixo.online" className="text-[15px] font-normal text-white/70 hover:text-red-500 transition">
                      contact@anixo.online
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-red-500/60" />
                  <div>
                    <p className="text-[10px] font-normal uppercase tracking-widest text-white/30 mb-1">DMCA & Copyright</p>
                    <a href="mailto:dmca@anixo.online" className="text-[15px] font-normal text-white/70 hover:text-red-500 transition">
                      dmca@anixo.online
                    </a>
                  </div>
                </div>
              </div>

              <p className="text-[12px] text-white/25 mt-4 italic font-normal">
                We aim to respond to all inquiries within 48 to 72 business hours.
                Please include a clear subject line and relevant details to ensure a timely response.
              </p>
            </div>
          </section>
        </div>

        {/* Final Note */}
        <div className="mt-16 pt-8 border-t border-white/5 text-center">
          <p className="text-[11px] text-white/20 font-normal max-w-[650px] mx-auto leading-relaxed">
            These Terms of Service apply solely to the AniXo platform and its associated domains.
            AniXo assumes no responsibility for the content, privacy policies, or practices of any third-party websites
            linked to, indexed by, or embedded within its platform. All trademarks, service marks, and trade names
            referenced herein are the property of their respective owners.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
