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

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 pb-20 sm:p-20">
      <Navbar className="bg-background/70 backdrop-blur-md">
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

      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full max-w-4xl">
        <div className="text-center sm:text-left">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-4">
            Multi-Tenant E-commerce Platform
          </h1>
          <p className="text-xl text-default-500 mb-8">
            Launch your store in seconds with our serverless architecture.
          </p>
          <div className="flex gap-4 justify-center sm:justify-start">
            <Button color="primary" size="lg">
              Get Started
            </Button>
            <Button variant="bordered" size="lg">
              Learn More
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mt-12">
          <Card>
            <CardBody>
              <h3 className="text-lg font-bold mb-2">Dedicated Backend</h3>
              <p className="text-small text-default-500">
                Each store gets its own isolated database and compute instance.
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
      </main>
    </div>
  );
}
