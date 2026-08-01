"use client";

import * as React from "react";

interface SkipLinkProps {
  /** The ID of the main content element to skip to */
  targetId?: string;
  /** Custom label for the skip link */
  label?: string;
}

/**
 * SkipLink component for keyboard users.
 * Provides a way to skip directly to main content,
 * bypassing navigation elements.
 *
 * Visually hidden until focused via keyboard (Tab).
 */
export function SkipLink({
  targetId = "main-content",
  label = "Skip to main content",
}: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      className="skip-link"
      onClick={handleClick}
      aria-label={label}
    >
      {label}
    </a>
  );
}
