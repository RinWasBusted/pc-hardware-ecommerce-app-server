import bcrypt from 'bcryptjs';
import { prisma } from '../../utils/prisma.js';
import { uploadToStorage, deleteFromStorage, getStorageUrl } from '../../utils/storage.js';

const addressSelect = {
  id: true,
  recipient: true,
  phone_number: true,
  province: true,
  district: true,
  ward: true,
  street: true,
  province_id: true,
  district_id: true,
  ward_code: true,
  is_default: true,
} as const;

type AddressInput = {
  recipient: string;
  phone_number: string;
  province: string;
  district: string;
  ward: string;
  street: string;
  province_id: number;
  district_id: number;
  ward_code: string;
};

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

  return {
	...user,
	avatar_url: await getStorageUrl(user.avatar_url || ''),
  };
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

  return {
  ...updatedUser,
  avatar_url: await getStorageUrl(updatedUser.avatar_url || ''),
  };
};

export const UpdateUserAvatar = async (userId: number, imageFile: Express.Multer.File) => {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        avatar_url: true,
      },
    });

    if (!existingUser) {
      throw new Error('Người dùng không tồn tại');
    }

    const imageKey = await uploadToStorage(imageFile, 'user/avatars');

    if ( existingUser.avatar_url ) {
      await deleteFromStorage(existingUser.avatar_url);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        avatar_url: imageKey,
      }
    });

    return true;
  } catch (error: any) {
    throw new Error('Lỗi khi xóa ảnh cũ:', error);
  }
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
  try {
  const addresses = await prisma.addresses.findMany({
    where: { user_id: userId },
    select: addressSelect,
    orderBy: [{ is_default: 'desc' }, { created_at: 'desc' }],
  });
  return addresses;
    
  } catch(error: any) {
    console.error('Error fetching user addresses:', error);
  }
  

};

export const CreateAddress = async (
  userId: number,
  data: AddressInput
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
      province_id: data.province_id,
      district_id: data.district_id,
      ward_code: data.ward_code,
      is_default: isDefault,
    },
    select: addressSelect,
  });

  return newAddress;
};

export const UpdateAddress = async (
  userId: number,
  addressId: number,
  data: AddressInput
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
      recipient: data.recipient,
      phone_number: data.phone_number,
      province: data.province,
      district: data.district,
      ward: data.ward,
      street: data.street,
      province_id: data.province_id,
      district_id: data.district_id,
      ward_code: data.ward_code,
    },
    select: addressSelect,
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
    select: addressSelect,
  });

  return updatedAddress;
};
