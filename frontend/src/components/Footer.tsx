import { Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="w-full bg-navy text-white py-3 md:py-5 mt-auto border-t-2 border-nps-gold rounded-lg">
      <div className="px-3 md:px-4">
        <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-center md:text-left animate-fade-in pb-safe">
          {/* NPSF Logo - add /npsf-logo.png to public folder */}
          <img src="/NPSF-native-app-icon.png" alt="Naval Postgraduate School Foundation Logo" className="h-8 md:h-12 w-auto flex-shrink-0" />
          <div className="flex flex-col gap-1 md:gap-2">
            <p className="text-sm md:text-xl font-bold text-white">
              Naval Postgraduate School Foundation
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-1 md:gap-2 text-[10px] md:text-sm text-white/90">
              <span>For questions, contact</span>
              <a href="mailto:converge@npsfoundation.org" className="flex items-center gap-1 md:gap-1.5 text-nps-gold hover:underline transition-colors font-medium">
                <Mail className="h-3 w-3 md:h-4 md:w-4" />
                converge@npsfoundation.org
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
