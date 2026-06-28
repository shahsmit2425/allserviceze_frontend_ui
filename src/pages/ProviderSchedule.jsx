import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useAuth } from "../context/AuthContext";
import ProviderCalendar from "../components/ProviderCalendar";
import MyBookings from "../components/MyBookings";
import { ArrowLeft, Calendar, MessageSquare, Phone, Video } from "lucide-react";

export default function ProviderSchedule() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <AppShell theme="provider" className="bg-background pb-12" contentClassName="pb-12" data-testid="provider-schedule-page">
      <div className="page-shell safe-bottom-shell py-6 sm:py-8">
        <section className="page-hero mb-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <span className="page-kicker">
                <Calendar className="h-3.5 w-3.5" /> Pro Schedule
              </span>
              <h1 className="heading-2 mt-4 text-foreground">Manage appointments, calendar blocks, and call settings in one place.</h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                Keep availability current, confirm upcoming appointments, and control whether each customer can use audio or video during booked calls.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge variant="secondary" className="rounded-lg px-3 py-1.5">
                  <Calendar className="mr-1.5 h-3.5 w-3.5" /> Block dates
                </Badge>
                <Badge variant="secondary" className="rounded-lg px-3 py-1.5">
                  <Phone className="mr-1.5 h-3.5 w-3.5" /> Audio call permissions
                </Badge>
                <Badge variant="secondary" className="rounded-lg px-3 py-1.5">
                  <Video className="mr-1.5 h-3.5 w-3.5" /> Video call permissions
                </Badge>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch">
              <Button variant="outline" className="rounded-lg bg-white border-deep-navy-100 hover:bg-deep-navy-50" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back To Dashboard
              </Button>
              <Button className="rounded-lg" onClick={() => navigate("/messages")}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Open Messages
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Card className="form-shell border border-deep-navy-100 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-copper-600" />
                Availability Calendar
              </CardTitle>
              <CardDescription>Block days, adjust weekly availability, and protect time around active jobs.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-3 sm:p-4 rounded-lg bg-deep-navy-50">
                <ProviderCalendar providerId={user?.id} />
              </div>
            </CardContent>
          </Card>

          <Card className="form-shell border border-deep-navy-100 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-copper-600" />
                Appointments And Calls
              </CardTitle>
              <CardDescription>Review booking requests, confirm visits, and manage the customer call options attached to each appointment.</CardDescription>
            </CardHeader>
            <CardContent>
              <MyBookings
                viewAs="provider"
                subscriptionTier={user?.subscription_tier || "free"}
                chatUID={user?.id}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
