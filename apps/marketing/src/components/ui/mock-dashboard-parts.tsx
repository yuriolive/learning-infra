"use client";

import {
  Button,
  Input,
  User,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Spacer,
} from "@heroui/react";
import {
  Search,
  Bell,
  Settings,
  LayoutDashboard,
  ShoppingBag,
  Users,
  CreditCard,
} from "lucide-react";

export const DashboardSidebar = () => (
  <div className="w-64 border-r border-default-200/50 p-4 hidden md:flex flex-col gap-2">
    <div className="flex items-center gap-2 px-2 py-4">
      <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold">
        V
      </div>
      <span className="font-bold text-lg">Vendin Store</span>
    </div>

    <Spacer y={4} />

    <Button
      variant="flat"
      color="primary"
      startContent={<LayoutDashboard size={18} />}
      className="justify-start"
    >
      Dashboard
    </Button>
    <Button
      variant="light"
      startContent={<ShoppingBag size={18} />}
      className="justify-start text-default-500"
    >
      Orders
    </Button>
    <Button
      variant="light"
      startContent={<Users size={18} />}
      className="justify-start text-default-500"
    >
      Customers
    </Button>
    <Button
      variant="light"
      startContent={<CreditCard size={18} />}
      className="justify-start text-default-500"
    >
      Products
    </Button>

    <div className="mt-auto">
      <Button
        variant="light"
        startContent={<Settings size={18} />}
        className="justify-start text-default-500"
      >
        Settings
      </Button>
    </div>
  </div>
);

export const DashboardHeader = () => (
  <div className="h-16 border-b border-default-200/50 flex items-center justify-between px-6">
    <Input
      classNames={{
        base: "max-w-xs h-10",
        mainWrapper: "h-full",
        input: "text-small",
        inputWrapper:
          "h-full font-normal text-default-500 bg-default-400/20 dark:bg-default-500/20",
      }}
      placeholder="Search..."
      size="sm"
      startContent={<Search size={18} />}
      type="search"
    />
    <div className="flex items-center gap-4">
      <Button isIconOnly variant="light" radius="full">
        <Bell size={20} className="text-default-500" />
      </Button>
      <User
        name="Jane Doe"
        description="Admin"
        avatarProps={{
          src: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
          size: "sm",
        }}
      />
    </div>
  </div>
);

export const RecentTransactionsTable = () => (
  <>
    <h3 className="text-sm font-semibold text-default-500 mb-4">
      Recent Transactions
    </h3>
    <Table aria-label="Example table with static content" removeWrapper>
      <TableHeader>
        <TableColumn>NAME</TableColumn>
        <TableColumn>STATUS</TableColumn>
        <TableColumn>DATE</TableColumn>
        <TableColumn>AMOUNT</TableColumn>
      </TableHeader>
      <TableBody>
        <TableRow key="1">
          <TableCell>Tony Reichert</TableCell>
          <TableCell>
            <Chip color="success" size="sm" variant="flat">
              Paid
            </Chip>
          </TableCell>
          <TableCell>2024-03-01</TableCell>
          <TableCell>$250.00</TableCell>
        </TableRow>
        <TableRow key="2">
          <TableCell>Zoey Lang</TableCell>
          <TableCell>
            <Chip color="warning" size="sm" variant="flat">
              Pending
            </Chip>
          </TableCell>
          <TableCell>2024-03-01</TableCell>
          <TableCell>$170.00</TableCell>
        </TableRow>
        <TableRow key="3">
          <TableCell>Jane Fisher</TableCell>
          <TableCell>
            <Chip color="danger" size="sm" variant="flat">
              Failed
            </Chip>
          </TableCell>
          <TableCell>2024-02-29</TableCell>
          <TableCell>$320.00</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </>
);
