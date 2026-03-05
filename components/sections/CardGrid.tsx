"use client";

import { motion } from "framer-motion";
import Section from "@/components/layout/Section";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export interface GridCard {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  image?: string;
  buttons?: Array<{
    text: string;
    href: string;
    variant?: "primary" | "secondary" | "outline" | "ghost";
  }>;
  badge?: string;
  color?: string; // For title color
}

export interface CardGridProps {
  heading?: string;
  subheading?: string;
  cards: GridCard[];
  columns?: 2 | 3 | 4;
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

export default function CardGrid({
  heading,
  subheading,
  cards,
  columns = 3,
  background = "white",
  banner,
  paddingTop,
  paddingBottom,
  fullScreen,
  snapThreshold,
  id,
}: CardGridProps) {
  const columnClasses = {
    2: "row-cols-1 row-cols-md-2",
    3: "row-cols-1 row-cols-md-2 row-cols-lg-3",
    4: "row-cols-1 row-cols-md-2 row-cols-xl-4",
  };

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
              transition={{ duration: 0.6, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
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
              transition={{ duration: 0.6, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              {subheading}
            </motion.p>
          )}
        </motion.div>
      )}

      <div className={`row g-4 ${columnClasses[columns]}`}>
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            className="col"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{
              duration: 0.5,
              delay: index * 0.1,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            <motion.div
              whileHover={{
                y: -8,
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
              }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <Card>
                {card.badge && (
                  <motion.span
                    className="badge bg-primary-subtle text-primary-emphasis rounded-pill mb-3"
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.4,
                      delay: index * 0.1 + 0.2,
                      type: "spring",
                      stiffness: 200,
                    }}
                  >
                    {card.badge}
                  </motion.span>
                )}

                {card.icon && (
                  <motion.div
                    className="mb-3 text-primary"
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.5,
                      delay: index * 0.1 + 0.2,
                      ease: [0.4, 0, 0.2, 1],
                    }}
                  >
                    {card.icon}
                  </motion.div>
                )}

                {card.image && (
                  <motion.img
                    src={card.image}
                    alt={card.title}
                    className="mb-3 rounded-3 w-100"
                    style={{ height: "192px", objectFit: "cover" }}
                    initial={{ opacity: 0, scale: 1.1 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.6,
                      delay: index * 0.1 + 0.2,
                      ease: [0.4, 0, 0.2, 1],
                    }}
                    whileHover={{ scale: 1.05 }}
                  />
                )}

                <motion.h3
                  className="h4 fw-semibold text-truncate"
                  style={card.color ? { color: card.color } : undefined}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.1 + 0.3,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                >
                  {card.title}
                </motion.h3>

                <motion.p
                  className="mt-3 text-muted"
                  style={{ overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" }}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.1 + 0.4,
                  }}
                >
                  {card.description}
                </motion.p>

                {card.buttons && card.buttons.length > 0 && (
                  <motion.div
                    className="mt-4 d-flex flex-wrap gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.4,
                      delay: index * 0.1 + 0.5,
                    }}
                  >
                    {card.buttons.map((button, btnIndex) => (
                      <motion.div
                        key={btnIndex}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          href={button.href}
                          variant={button.variant || "primary"}
                          size="sm"
                        >
                          {button.text}
                        </Button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </Card>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
