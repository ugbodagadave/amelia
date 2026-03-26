import { FirstAidKitIcon, GearSixIcon, IdentificationCardIcon } from "@phosphor-icons/react"

import { GeneralClinicSettingsSection } from "@/components/settings/GeneralClinicSettingsSection"
import { HmoDirectorySettingsSection } from "@/components/settings/HmoDirectorySettingsSection"
import { ServiceCatalogSettingsSection } from "@/components/settings/ServiceCatalogSettingsSection"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function SettingsTabsShell() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-mono text-2xl font-bold tracking-tight">Settings</h1>

      <Tabs defaultValue="services">
        <TabsList className="gap-2 bg-transparent p-0">
          <TabsTrigger
            value="services"
            className="gap-2 border border-border bg-background px-3 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <FirstAidKitIcon />
            Services
          </TabsTrigger>
          <TabsTrigger
            value="hmos"
            className="gap-2 border border-border bg-background px-3 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <IdentificationCardIcon />
            HMOs
          </TabsTrigger>
          <TabsTrigger
            value="general"
            className="gap-2 border border-border bg-background px-3 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <GearSixIcon />
            General Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-6">
          <ServiceCatalogSettingsSection />
        </TabsContent>

        <TabsContent value="hmos" className="mt-6">
          <HmoDirectorySettingsSection />
        </TabsContent>

        <TabsContent value="general" className="mt-6">
          <GeneralClinicSettingsSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
