"use client";

import Image from "next/image";
import { motion } from "motion/react";
import Section from "@/components/layout/Section";
import Button from "@/components/ui/Button";

export interface TextImageSectionProps {
  heading: string;
  content: string | React.ReactNode;
  imageSrc: string;
  imageAlt: string;
  layout?: "left" | "right"; // Image position
  buttons?: Array<{
    text: string;
    href: string;
    variant?: "primary" | "secondary" | "outline";
  }>;
  background?: "white" | "gray" | "blue" | "transparent" | "lightblue";
  banner?: {
    content: React.ReactNode;
    variant: "info" | "success" | "warning" | "error";
  };
  paddingTop?: number;
  paddingBottom?: number;
  fullScreen?: boolean;
  snapThreshold?: number;
  id?: string;
}

export default function TextImageSection({
  heading,
  content,
  imageSrc,
  imageAlt,
  layout = "right",
  buttons,
  background = "white",
  banner,
  paddingTop,
  paddingBottom,
  fullScreen,
  snapThreshold,
  id,
}: TextImageSectionProps) {
  return (
    <Section
      background={background}
      banner={banner}
      paddingTop={paddingTop}
      paddingBottom={paddingBottom}
      fullScreen={fullScreen}
      snapThreshold={snapThreshold}
      id={id}
    >
      <div className="row g-5 align-items-center">
        {/* Text Content */}
        <motion.div
          className={`col-12 col-md-6 ${layout === "left" ? "order-md-2" : ""}`}
          initial={{ opacity: 0, x: layout === "right" ? -50 : 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.h2
            className="display-5 fw-bold text-dark mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
          >
            {heading}
          </motion.h2>

          <motion.div
            className="text-muted fs-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            {typeof content === "string" ? (
              <div dangerouslySetInnerHTML={{ __html: content }} />
            ) : (
              content
            )}
          </motion.div>

          {buttons && buttons.length > 0 && (
            <motion.div
              className="mt-4 d-flex flex-wrap gap-3"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              {buttons.map((button, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.4,
                    delay: 0.3 + index * 0.1,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    href={button.href}
                    variant={button.variant || "primary"}
                  >
                    {button.text}
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Image */}
        <motion.div
          className={`col-12 col-md-6 ${layout === "left" ? "order-md-1" : ""}`}
          initial={{ opacity: 0, x: layout === "right" ? 50 : -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.div
            className="position-relative rounded-3 shadow-lg overflow-hidden"
            style={{ aspectRatio: "16/9" }}
            whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)" }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <Image
              src={imageSrc}
              alt={imageAlt}
              fill
              style={{ objectFit: "cover" }}
            />
          </motion.div>
        </motion.div>
      </div>
    </Section>
  );
}
