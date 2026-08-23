import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../config/prisma";

export const publicUserSelect = {
  id: true,
  name: true,
  login: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

class UserRepository {
  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data,
      select: publicUserSelect,
    });
  }

  async findAll() {
    return prisma.user.findMany({
      where: {
        active: true,
      },
      select: publicUserSelect,
      orderBy: {
        name: "asc",
      },
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: {
        id,
      },
      select: publicUserSelect,
    });
  }

  async findAuthenticationById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        active: true,
        tokenVersion: true,
      },
    });
  }

  async findByLogin(login: string) {
    return prisma.user.findUnique({
      where: {
        login,
      },
    });
  }

  async findPrivateById(id: string) {
    return prisma.user.findUnique({
      where: {
        id,
      },
    });
  }

  async countActiveAdmins() {
    return prisma.user.count({
      where: {
        role: UserRole.ADMIN,
        active: true,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.UserUpdateInput,
    revokeSessions = false
  ) {
    return prisma.user.update({
      where: {
        id,
      },
      data: {
        ...data,
        tokenVersion: revokeSessions ? { increment: 1 } : undefined,
      },
      select: publicUserSelect,
    });
  }

  async updatePasswordAndRevokeSessions(id: string, password: string) {
    return prisma.user.update({
      where: {
        id,
      },
      data: {
        password,
        tokenVersion: { increment: 1 },
      },
      select: publicUserSelect,
    });
  }

  async deactivate(id: string) {
    return prisma.user.update({
      where: {
        id,
      },
      data: {
        active: false,
        tokenVersion: { increment: 1 },
      },
      select: publicUserSelect,
    });
  }
}

export { UserRepository };
