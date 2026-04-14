import path from 'path';
import {
  PrismaClient,
  Role,
  ProjectStatus,
  TaskStatus,
  Priority,
  MilestoneStatus,
} from '@prisma/client';

// Resolve bcrypt from backend workspace (seed file lives at repo root /prisma)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require(path.join(
  __dirname,
  '..',
  'apps',
  'backend',
  'node_modules',
  'bcryptjs'
));

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pm.local' },
    update: {},
    create: {
      first_name: 'Super',
      last_name: 'Admin',
      email: 'admin@pm.local',
      password_hash: await bcrypt.hash('Admin@1234', 12),
      role: Role.admin,
      status: 'active',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@pm.local' },
    update: {},
    create: {
      first_name: 'Jane',
      last_name: 'Manager',
      email: 'manager@pm.local',
      password_hash: await bcrypt.hash('Manager@1234', 12),
      role: Role.manager,
      status: 'active',
    },
  });

  const member = await prisma.user.upsert({
    where: { email: 'alice@pm.local' },
    update: {},
    create: {
      first_name: 'Alice',
      last_name: 'Dev',
      email: 'alice@pm.local',
      password_hash: await bcrypt.hash('Member@1234', 12),
      role: Role.member,
      status: 'active',
    },
  });

  let project = await prisma.project.findFirst({
    where: { project_name: 'Website Redesign', created_by: manager.user_id },
  });
  if (!project) {
    project = await prisma.project.create({
      data: {
        project_name: 'Website Redesign',
        description: 'Full redesign of company website',
        start_date: new Date(),
        end_date: new Date(Date.now() + 90 * 86400000),
        status: ProjectStatus.active,
        created_by: manager.user_id,
      },
    });
  }

  await prisma.projectMember.upsert({
    where: {
      project_id_user_id: {
        project_id: project.project_id,
        user_id: member.user_id,
      },
    },
    update: {},
    create: {
      project_id: project.project_id,
      user_id: member.user_id,
      assigned_role: 'developer',
    },
  });

  const milestoneExists = await prisma.milestone.findFirst({
    where: { project_id: project.project_id, title: 'Design Approval' },
  });
  if (!milestoneExists) {
    await prisma.milestone.create({
      data: {
        title: 'Design Approval',
        project_id: project.project_id,
        due_date: new Date(Date.now() + 14 * 86400000),
        status: MilestoneStatus.upcoming,
      },
    });
  }

  let task = await prisma.task.findFirst({
    where: { project_id: project.project_id, title: 'Design new homepage' },
  });
  if (!task) {
    task = await prisma.task.create({
      data: {
        title: 'Design new homepage',
        priority: Priority.high,
        status: TaskStatus.todo,
        sort_order: 1,
        start_date: new Date(),
        due_date: new Date(Date.now() + 7 * 86400000),
        project_id: project.project_id,
        assigned_to: member.user_id,
        created_by: manager.user_id,
      },
    });
  }

  const designLabel = await prisma.label.upsert({
    where: { project_id_name: { project_id: project.project_id, name: 'design' } },
    update: { color: '#8b5cf6' },
    create: {
      project_id: project.project_id,
      name: 'design',
      color: '#8b5cf6',
    },
  });

  const frontendLabel = await prisma.label.upsert({
    where: { project_id_name: { project_id: project.project_id, name: 'frontend' } },
    update: { color: '#3b82f6' },
    create: {
      project_id: project.project_id,
      name: 'frontend',
      color: '#3b82f6',
    },
  });

  await prisma.taskLabel.upsert({
    where: {
      task_id_label_id: {
        task_id: task.task_id,
        label_id: designLabel.label_id,
      },
    },
    update: {},
    create: {
      task_id: task.task_id,
      label_id: designLabel.label_id,
    },
  });

  await prisma.taskLabel.upsert({
    where: {
      task_id_label_id: {
        task_id: task.task_id,
        label_id: frontendLabel.label_id,
      },
    },
    update: {},
    create: {
      task_id: task.task_id,
      label_id: frontendLabel.label_id,
    },
  });

  console.log('Seed complete.');
  console.log('Admin:   admin@pm.local   / Admin@1234');
  console.log('Manager: manager@pm.local / Manager@1234');
  console.log('Member:  alice@pm.local   / Member@1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
