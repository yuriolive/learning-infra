"use client";

import {
  Button,
  Card,
  CardBody,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link,
} from "@heroui/react";

import { HeroSection } from "@/components/hero-section";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center">
      <Navbar
        className="bg-background/70 backdrop-blur-md w-full"
        maxWidth="xl"
      >
        <NavbarBrand>
          <p className="font-bold text-inherit">VENDIN</p>
        </NavbarBrand>
        <NavbarContent className="hidden sm:flex gap-4" justify="center">
          <NavbarItem>
            <Link color="foreground" href="#">
              Features
            </Link>
          </NavbarItem>
          <NavbarItem isActive>
            <Link href="#" aria-current="page">
              Pricing
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link color="foreground" href="#">
              Integrations
            </Link>
          </NavbarItem>
        </NavbarContent>
        <NavbarContent justify="end">
          <NavbarItem className="hidden lg:flex">
            <Link href="#">Login</Link>
          </NavbarItem>
          <NavbarItem>
            <Button as={Link} color="primary" href="#" variant="flat">
              Sign Up
            </Button>
          </NavbarItem>
        </NavbarContent>
      </Navbar>

      <main className="flex flex-col w-full">
        <HeroSection
          title="Multi-Tenant E-commerce Platform"
          subtitle="Launch your store in seconds with our serverless architecture."
        />

        <div className="container mx-auto px-6 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 w-full">
            <Card>
              <CardBody>
                <h3 className="text-lg font-bold mb-2">Dedicated Backend</h3>
                <p className="text-small text-default-500">
                  Each store gets its own isolated database and compute
                  instance.
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <h3 className="text-lg font-bold mb-2">Scale to Zero</h3>
                <p className="text-small text-default-500">
                  Pay only for what you use. Infrastructure sleeps when idle.
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <h3 className="text-lg font-bold mb-2">Global Edge</h3>
                <p className="text-small text-default-500">
                  Storefronts served from the edge for maximum performance.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
