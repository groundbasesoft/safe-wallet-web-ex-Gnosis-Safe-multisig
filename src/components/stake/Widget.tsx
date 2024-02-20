"use client"

import "@stakekit/widget/package/css";
import { SKApp, darkTheme } from "@stakekit/widget"

export const Widget = () => {
  return (
    <>
      <SKApp apiKey="api-key-here" theme={darkTheme} connectKitForceTheme="darkMode" />
    </>
  )
}
