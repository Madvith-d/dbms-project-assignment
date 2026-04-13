"use client";

import { useProject } from "@/lib/hooks/useProjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export default function MembersPage({ params }: { params: { id: string } }) {
  const { data: project, isLoading } = useProject(params.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading members...</p>
      </div>
    );
  }

  const members = project?.members ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Members</h2>
      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Users className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">No members yet</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <Card key={member.user_id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {member.user
                      ? `${member.user.first_name} ${member.user.last_name}`
                      : member.user_id}
                  </CardTitle>
                  <Badge variant="outline">{member.role}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {member.user && (
                  <p className="text-sm text-muted-foreground">
                    {member.user.email}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
