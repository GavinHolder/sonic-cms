"use client";

import { motion } from "motion/react";
import type { StatsGridBlock as StatsGridBlockType } from "@/types/section-v2";

/**
 * Statistics Grid Content Block
 *
 * Display statistics in grid format with animated counters.
 * Stripped of section wrapper — renders ONLY content for use inside sections.
 */

interface StatsGridBlockProps {
  block: StatsGridBlockType;
}

export default function StatsGridBlock({ block }: StatsGridBlockProps) {
  const { heading, subheading, stats, columns = 3 } = block;

  const columnClasses: Record<number, string> = {
    2: "row-cols-1 row-cols-md-2",
    3: "row-cols-1 row-cols-md-3",
    4: "row-cols-1 row-cols-md-2 row-cols-lg-4",
  };

  return (
    <div>
      {(heading || subheading) && (
        <motion.div
          className="mb-5 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          {heading && (
            <motion.h2
              className="display-5 fw-bold text-dark"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.6,
                delay: 0.1,
                ease: [0.4, 0, 0.2, 1],
              }}
            >
              {heading}
            </motion.h2>
          )}
          {subheading && (
            <motion.p
              className="mt-3 fs-5 text-muted"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.6,
                delay: 0.2,
                ease: [0.4, 0, 0.2, 1],
              }}
            >
              {subheading}
            </motion.p>
          )}
        </motion.div>
      )}

      <div className={`row g-4 ${columnClasses[columns]}`}>
        {stats.map((stat, index) => (
          <motion.div
            key={stat.id}
            className="col"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{
              duration: 0.5,
              delay: index * 0.1,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            <motion.div
              className="text-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="display-4 fw-bold text-primary"
                initial={{ scale: 0.5, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.1 + 0.2,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
              >
                {stat.prefix}
                {stat.value}
                {stat.suffix}
              </motion.div>
              <motion.div
                className="mt-2 fs-5 fw-semibold text-dark"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.1 + 0.3,
                }}
              >
                {stat.label}
              </motion.div>
              {stat.description && (
                <motion.p
                  className="mt-2 small text-muted"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.1 + 0.4,
                  }}
                >
                  {stat.description}
                </motion.p>
              )}
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
