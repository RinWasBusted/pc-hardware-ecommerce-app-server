import bcrypt from 'bcryptjs';
import { prisma } from '../../utils/prisma.js';

export const GetUserProfile = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      full_name: true,
      email: true,
      phone_number: true,
      avatar_url: true,
      setting: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error('Người dùng không tồn tại');
  }

  return user;
};

export const UpdateUserProfile = async (
  userId: number,
  data: {
    full_name?: string;
    phone_number?: string;
    setting?: any;
  }
) => {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.full_name && { full_name: data.full_name }),
      ...(data.phone_number && { phone_number: data.phone_number }),
      ...(data.setting && { setting: data.setting }),
    },
    select: {
      id: true,
      full_name: true,
      email: true,
      phone_number: true,
      avatar_url: true,
      setting: true,
      role: true,
    },
  });

  return updatedUser;
};

export const ChangePassword = async (
  userId: number,
  oldPassword: string,
  newPassword: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if(oldPassword === newPassword) {
    throw new Error('Mật khẩu mới phải khác mật khẩu cũ');
  }

  if (!user) {
    throw new Error('Người dùng không tồn tại');
  }

  // Verify old password
  const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
  if (!isPasswordValid) {
    throw new Error('Mật khẩu hiện tại không đúng');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return { message: 'Đổi mật khẩu thành công' };
};

export const GetUserAddresses = async (userId: number) => {
  const addresses = await prisma.addresses.findMany({
    where: { user_id: userId },
    select: {
      id: true,
      recipient: true,
      phone_number: true,
      province: true,
      district: true,
      ward: true,
      street: true,
      is_default: true,
    },
    orderBy: [{ is_default: 'desc' }, { created_at: 'desc' }],
  });

  return addresses;
};

export const CreateAddress = async (
  userId: number,
  data: {
    recipient: string;
    phone_number: string;
    province: string;
    district: string;
    ward: string;
    street: string;
  }
) => {
  const existingAddressCount = await prisma.addresses.count({
    where: { user_id: userId },
  });

  const isDefault = existingAddressCount === 0;

  const newAddress = await prisma.addresses.create({
    data: {
      user_id: userId,
      recipient: data.recipient,
      phone_number: data.phone_number,
      province: data.province,
      district: data.district,
      ward: data.ward,
      street: data.street,
      is_default: isDefault,
    },
    select: {
      id: true,
      recipient: true,
      phone_number: true,
      province: true,
      district: true,
      ward: true,
      street: true,
      is_default: true,
    },
  });

  return newAddress;
};

export const UpdateAddress = async (
  userId: number,
  addressId: number,
  data: {
    recipient?: string;
    phone_number?: string;
    province?: string;
    district?: string;
    ward?: string;
    street?: string;
  }
) => {
  // Verify address belongs to user
  const address = await prisma.addresses.findUnique({
    where: { id: addressId },
  });

  if (!address || address.user_id !== userId) {
    throw new Error('Địa chỉ không tồn tại');
  }

  const updatedAddress = await prisma.addresses.update({
    where: { id: addressId },
    data: {
      ...(data.recipient && { recipient: data.recipient }),
      ...(data.phone_number && { phone_number: data.phone_number }),
      ...(data.province && { province: data.province }),
      ...(data.district && { district: data.district }),
      ...(data.ward && { ward: data.ward }),
      ...(data.street && { street: data.street }),
    },
    select: {
      id: true,
      recipient: true,
      phone_number: true,
      province: true,
      district: true,
      ward: true,
      street: true,
      is_default: true,
    },
  });

  return updatedAddress;
};

export const DeleteAddress = async (userId: number, addressId: number) => {
  // Verify address belongs to user
  const address = await prisma.addresses.findUnique({
    where: { id: addressId },
  });

  if (!address || address.user_id !== userId) {
    throw new Error('Địa chỉ không tồn tại');
  }

  await prisma.$transaction(async (tx) => {
    await tx.addresses.delete({
      where: { id: addressId },
    });

    if (address.is_default) {
      const newestAddress = await tx.addresses.findFirst({
        where: { user_id: userId },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      });

      if (newestAddress) {
        await tx.addresses.update({
          where: { id: newestAddress.id },
          data: { is_default: true },
        });
      }
    }
  });

  return { message: 'Xóa địa chỉ thành công' };
};

export const SetDefaultAddress = async (userId: number, addressId: number) => {
  // Verify address belongs to user
  const address = await prisma.addresses.findUnique({
    where: { id: addressId },
  });

  if (!address || address.user_id !== userId) {
    throw new Error('Địa chỉ không tồn tại');
  }

  // Unset other default addresses
  await prisma.addresses.updateMany({
    where: { user_id: userId, is_default: true, id: { not: addressId } },
    data: { is_default: false },
  });

  // Set this address as default
  const updatedAddress = await prisma.addresses.update({
    where: { id: addressId },
    data: { is_default: true },
    select: {
      id: true,
      recipient: true,
      phone_number: true,
      province: true,
      district: true,
      ward: true,
      street: true,
      is_default: true,
    },
  });

  return updatedAddress;
};
