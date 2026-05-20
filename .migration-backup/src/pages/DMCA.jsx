import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Shield, Mail, FileText, AlertTriangle, Scale, ChevronRight, UserCheck, RefreshCw } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

export default function DMCA() {
  useEffect(() => {
    document.title = "DMCA Policy | AniXo";
    window.scrollTo(0, 0);
  }, []);

  const sections = [
    {
      id: "disclaimer",
      icon: Shield,
      title: "Disclaimer — No File Hosting",
      content: (
        <>
          <p>
            AniXo does not host, store, upload, cache, or distribute any video files, audio files, media content, or copyrighted material on its own servers or infrastructure.
            All audiovisual content accessible through AniXo is sourced exclusively from third-party providers and external websites.
            These third-party services are not owned, operated, controlled, or affiliated with AniXo in any capacity.
          </p>
          <p>
            AniXo operates solely as a user interface and link-referral service, providing an organized index of embedded media players and hyperlinks
            that direct users to content hosted on external servers maintained by independent third parties.
            AniXo exercises no editorial control over the content, accuracy, legality, or availability of the media accessible through these third-party sources.
          </p>
          <p>
            Notwithstanding the foregoing, AniXo is committed to cooperating with copyright holders and their authorized representatives.
            If you believe that any content accessible through AniXo infringes upon your intellectual property rights,
            we encourage you to submit a DMCA takedown notice directly to our designated agent as described below.
            Upon receipt of a valid and complete notice, AniXo will take prompt action to remove or disable access to the referenced material from its platform.
          </p>
        </>
      ),
    },
    {
      id: "infringement",
      icon: FileText,
      title: "Copyright Infringement Notice",
      content: (
        <>
          <p>
            AniXo respects the intellectual property rights of all parties and operates in compliance with the
            Digital Millennium Copyright Act (DMCA), codified at Title 17, United States Code, Section 512(c)(2),
            and other applicable international copyright frameworks.
          </p>
          <p>
            If you are a copyright owner — or an agent duly authorized to act on behalf of a copyright owner — and you believe in good faith
            that content linked to, indexed by, or embedded on AniXo infringes upon your exclusive rights under copyright law,
            you may submit a formal written DMCA takedown notification to AniXo's designated copyright agent.
          </p>
          <p>
            Upon receipt of a notification that substantially complies with the requirements set forth below,
            AniXo will act expeditiously to investigate the claim and, where appropriate,
            remove or disable access to the allegedly infringing material. AniXo aims to process all substantively complete
            and legally valid takedown requests within 24 to 72 business hours of receipt.
          </p>
        </>
      ),
    },
    {
      id: "requirements",
      icon: Scale,
      title: "Requirements for a Valid DMCA Notice",
      content: (
        <>
          <p>
            Pursuant to 17 U.S.C. § 512(c)(3), a valid DMCA takedown notification must be a written communication
            submitted to AniXo's designated agent and must include substantially the following:
          </p>
          <ol className="list-decimal list-inside space-y-3 text-white/40 mt-4">
            <li>
              <span className="text-white/50">Identification of the copyrighted work</span> — A description of the copyrighted work that you claim has been infringed, or, if multiple copyrighted works are covered by a single notification, a representative list of such works.
            </li>
            <li>
              <span className="text-white/50">Identification of the infringing material</span> — Identification of the material that is claimed to be infringing or to be the subject of infringing activity, including the specific URL(s) on AniXo where such material appears, with sufficient detail to permit AniXo to locate the material.
            </li>
            <li>
              <span className="text-white/50">Contact information of the complainant</span> — Your full legal name, postal address, telephone number, and email address at which you may be contacted.
            </li>
            <li>
              <span className="text-white/50">Good faith statement</span> — A statement that you have a good faith belief that the use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.
            </li>
            <li>
              <span className="text-white/50">Accuracy and authority statement</span> — A statement, made under penalty of perjury, that the information contained in the notification is accurate and that you are the copyright owner or are authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.
            </li>
            <li>
              <span className="text-white/50">Signature</span> — A physical or electronic signature of the copyright owner or a person authorized to act on behalf of the copyright owner.
            </li>
          </ol>
          <div className="mt-6 p-4 bg-red-500/5 border border-red-500/10 rounded-lg">
            <p className="text-[12px] text-red-400/60 font-normal flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>
                Notice: Under Section 512(f) of the DMCA, any person who knowingly and materially misrepresents
                that material or activity is infringing may be subject to liability for damages,
                including costs and attorneys' fees incurred by the alleged infringer or by AniXo.
                Please ensure that your claim is accurate and submitted in good faith before filing a takedown notice.
              </span>
            </p>
          </div>
        </>
      ),
    },
    {
      id: "agent",
      icon: UserCheck,
      title: "Designated DMCA Agent",
      content: (
        <>
          <p>
            AniXo has designated the following agent to receive notifications of claimed copyright infringement
            in accordance with the DMCA. All takedown notices, counter-notifications, and related correspondence
            should be directed to:
          </p>
          <div className="mt-4 p-5 bg-white/[0.02] border border-white/5 rounded-lg space-y-2">
            <p><span className="text-white/50">Designated Agent:</span> AniXo Copyright Department</p>
            <p><span className="text-white/50">Email:</span> dmca@anixo.online</p>
            <p><span className="text-white/50">Subject Line:</span> DMCA Takedown Notice — [Title of Content]</p>
          </div>
          <p className="mt-4">
            Notices delivered to any other contact or department may not receive a timely response.
            Only communications directed to the designated agent at the address above will be accepted as formal DMCA notifications.
          </p>
        </>
      ),
    },
    {
      id: "counter",
      icon: FileText,
      title: "Counter-Notification Process",
      content: (
        <>
          <p>
            If you believe that material you posted, linked, or made available was removed or disabled as a result of a mistake
            or misidentification of the material, you may submit a written counter-notification to AniXo's designated agent
            pursuant to 17 U.S.C. § 512(g).
          </p>
          <p>A valid counter-notification must include substantially the following:</p>
          <ol className="list-decimal list-inside space-y-3 text-white/40 mt-4">
            <li>
              <span className="text-white/50">Your identity</span> — Your full legal name, postal address, telephone number, and email address.
            </li>
            <li>
              <span className="text-white/50">Identification of removed material</span> — Identification of the material that was removed or to which access was disabled, and the location at which the material appeared before it was removed or access was disabled.
            </li>
            <li>
              <span className="text-white/50">Statement under penalty of perjury</span> — A statement, made under penalty of perjury, that you have a good faith belief that the material was removed or disabled as a result of mistake or misidentification of the material.
            </li>
            <li>
              <span className="text-white/50">Consent to jurisdiction</span> — A statement that you consent to the jurisdiction of the Federal District Court for the judicial district in which your address is located (or, if your address is outside of the United States, any judicial district in which AniXo may be found), and that you will accept service of process from the person who provided the original notification or an agent of such person.
            </li>
            <li>
              <span className="text-white/50">Your signature</span> — Your physical or electronic signature.
            </li>
          </ol>
          <p className="mt-4">
            Upon receipt of a valid counter-notification, AniXo will promptly forward a copy to the original complainant.
            If the original complainant does not file a court action seeking to restrain the allegedly infringing activity
            within ten (10) to fourteen (14) business days of receiving the counter-notification,
            AniXo may, at its sole discretion, restore access to the removed material.
          </p>
        </>
      ),
    },
    {
      id: "repeat",
      icon: RefreshCw,
      title: "Repeat Infringer Policy",
      content: (
        <>
          <p>
            In accordance with the DMCA and other applicable law, AniXo maintains a policy of terminating,
            in appropriate circumstances, the accounts or access privileges of users who are deemed to be repeat infringers.
          </p>
          <p>
            AniXo may also, at its sole discretion, limit access to the platform and/or permanently remove
            any content associated with any user or third-party source that is determined to have repeatedly infringed
            the intellectual property rights of others, regardless of whether formal DMCA notifications have been submitted.
          </p>
        </>
      ),
    },
    {
      id: "goodfaith",
      icon: Shield,
      title: "Good Faith & Limitation of Liability",
      content: (
        <>
          <p>
            AniXo operates in good faith and takes reasonable measures to comply with all applicable copyright laws,
            regulations, and industry best practices. AniXo endeavors to address all legitimate DMCA complaints promptly
            and to cooperate with copyright holders in the protection of their intellectual property.
          </p>
          <p>
            AniXo shall not be held liable for any content hosted by third-party services linked to or embedded within its platform.
            The responsibility for the legality of content hosted on external servers rests solely with those third-party providers
            and the individuals who upload or distribute such content.
          </p>
          <p>
            AniXo reserves the right to remove any content, disable any links, or restrict access to any portion of its platform
            at its sole discretion, with or without prior notice, for any reason — including, but not limited to,
            a good faith belief that such content or activity may violate applicable law or the rights of third parties.
          </p>
        </>
      ),
    },
    {
      id: "changes",
      icon: FileText,
      title: "Modifications to This Policy",
      content: (
        <>
          <p>
            AniXo reserves the right to modify, amend, or update this DMCA Policy at any time, with or without prior notice.
            Any changes will become effective immediately upon posting of the revised policy on this page.
            The "Last Updated" date at the top of this page will be revised accordingly.
          </p>
          <p>
            Your continued use of AniXo following the posting of any changes constitutes your acceptance of and agreement
            to be bound by the modified policy. You are encouraged to review this page periodically to stay informed of any updates.
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
            <span className="text-white/50">DMCA Policy</span>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600/20 to-red-900/20 border border-red-500/10 flex items-center justify-center">
              <Shield size={24} className="text-red-500" />
            </div>
            <div>
              <h1 className="text-[28px] md:text-[36px] font-semibold tracking-tight leading-tight">
                DMCA Policy
              </h1>
              <p className="text-[12px] text-white/30 font-normal mt-1">
                Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>

          <p className="text-[14px] text-white/40 leading-relaxed max-w-[700px] font-normal">
            AniXo is committed to respecting the intellectual property rights of content creators, copyright holders, and their authorized representatives.
            This page sets forth the policy and procedures for reporting copyright infringement in accordance with the Digital Millennium Copyright Act of 1998.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="mb-12 p-5 bg-white/[0.02] border border-white/5 rounded-xl">
          <h2 className="text-[11px] font-medium uppercase tracking-widest text-white/40 mb-4">Table of Contents</h2>
          <nav className="space-y-2.5">
            {sections.map((section, i) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center gap-3 text-[13px] font-normal text-white/35 hover:text-white/70 transition-all group"
              >
                <span className="text-[11px] font-mono text-white/15 group-hover:text-red-500/70 transition w-6">{String(i + 1).padStart(2, "0")}.</span>
                {section.title}
              </a>
            ))}
            <a href="#contact" className="flex items-center gap-3 text-[13px] font-normal text-white/35 hover:text-white/70 transition-all group">
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
                All DMCA-related correspondence — including takedown notices, counter-notifications, and general copyright inquiries —
                must be submitted in writing to AniXo's designated copyright agent at the contact details provided below.
              </p>

              <div className="p-6 bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/5 rounded-xl space-y-4">
                <div className="flex items-center gap-3">
                  <Mail size={18} className="text-red-500/60" />
                  <div>
                    <p className="text-[10px] font-normal uppercase tracking-widest text-white/30 mb-1">Email</p>
                    <a href="mailto:dmca@anixo.online" className="text-[15px] font-normal text-white/70 hover:text-red-500 transition">
                      dmca@anixo.online
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-red-500/60" />
                  <div>
                    <p className="text-[10px] font-normal uppercase tracking-widest text-white/30 mb-1">Subject Line Format</p>
                    <p className="text-[13px] font-mono text-white/45">DMCA Takedown Notice — [Title of Content]</p>
                  </div>
                </div>
              </div>

              <p className="text-[12px] text-white/25 mt-4 italic font-normal">
                Please allow 24 to 72 business hours for a response. Notices that are incomplete, insufficiently detailed,
                or that fail to comply with the statutory requirements outlined above may be returned for correction
                before any action is taken.
              </p>
            </div>
          </section>
        </div>

        {/* Final Note */}
        <div className="mt-16 pt-8 border-t border-white/5 text-center">
          <p className="text-[11px] text-white/20 font-normal max-w-[650px] mx-auto leading-relaxed">
            This DMCA Policy applies solely to the AniXo platform and its associated domains.
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
