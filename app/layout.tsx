import React from "react";
import SrcRootLayout from "../src/app/layout";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <SrcRootLayout>{children}</SrcRootLayout>;
}
