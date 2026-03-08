import React from "react";
import clsx from "clsx";

export function Skeleton({ className }) {
  return <div className={clsx("skeleton", className)} aria-hidden="true" />;
}
