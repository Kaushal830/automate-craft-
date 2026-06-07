"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export function SplashScreen() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const hide = () => {
      window.setTimeout(() => setShow(false), 450);
    };

    if (document.readyState === "complete") {
      hide();
      return;
    }

    window.addEventListener("load", hide, { once: true });
    return () => window.removeEventListener("load", hide);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-[#09090b]"
        >
          <div className="relative flex items-center justify-center">
            <Image
              src="/logo-new.png"
              alt="Loading..."
              width={64}
              height={64}
              className="object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
              style={{ width: "auto", height: "auto" }}
              priority
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
