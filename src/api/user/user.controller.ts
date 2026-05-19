import type { Request, Response } from 'express';
import { GetUserProfile, UpdateUserProfile, ChangePassword, GetUserAddresses, CreateAddress, UpdateAddress, DeleteAddress, SetDefaultAddress } from './user.service.js';
import { UpdateUserAvatar } from './user.service.js';

type AddressPayload = {
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

const parseAddressPayload = (body: any): { data?: AddressPayload; message?: string } => {
  const recipient = typeof body.recipient === 'string' ? body.recipient.trim() : '';
  const phoneNumber = typeof body.phone_number === 'string' ? body.phone_number.trim() : '';
  const province = typeof body.province === 'string' ? body.province.trim() : '';
  const district = typeof body.district === 'string' ? body.district.trim() : '';
  const ward = typeof body.ward === 'string' ? body.ward.trim() : '';
  const street = typeof body.street === 'string' ? body.street.trim() : '';
  const wardCode = typeof body.ward_code === 'string' ? body.ward_code.trim() : '';
  const provinceId = Number(body.province_id);
  const districtId = Number(body.district_id);

  if (!recipient) return { message: 'recipient không hợp lệ' };
  if (!phoneNumber) return { message: 'phone_number không hợp lệ' };
  if (!province) return { message: 'province không hợp lệ' };
  if (!district) return { message: 'district không hợp lệ' };
  if (!ward) return { message: 'ward không hợp lệ' };
  if (!street) return { message: 'street không hợp lệ' };
  if (!Number.isInteger(provinceId) || provinceId <= 0) return { message: 'province_id không hợp lệ' };
  if (!Number.isInteger(districtId) || districtId <= 0) return { message: 'district_id không hợp lệ' };
  if (!wardCode) return { message: 'ward_code không hợp lệ' };

  return {
    data: {
      recipient,
      phone_number: phoneNumber,
      province,
      district,
      ward,
      street,
      province_id: provinceId,
      district_id: districtId,
      ward_code: wardCode,
    },
  };
};

export const GetMe = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;

    const userProfile = await GetUserProfile(userId);

    return res.status(200).json({
      success: true,
      data: userProfile,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const UpdateMe = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    const { full_name, phone_number, setting } = req.body;

    const updatedUser = await UpdateUserProfile(userId, {
      full_name,
      phone_number,
      setting,
    });

    return res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'Cập nhật thông tin cá nhân thành công',
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const ChangePasswordMe = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu cũ và mật khẩu mới là bắt buộc',
      });
    }

    await ChangePassword(userId, old_password, new_password);

    return res.status(200).json({
      success: true,
      message: 'Đổi mật khẩu thành công',
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const GetMyAddresses = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;

    const addresses = await GetUserAddresses(userId);

    return res.status(200).json({
      success: true,
      data: addresses,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const AddAddress = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    const parsedAddress = parseAddressPayload(req.body);

    if (!parsedAddress.data) {
      return res.status(400).json({
        success: false,
        message: parsedAddress.message,
      });
    }

    const newAddress = await CreateAddress(userId, parsedAddress.data);

    return res.status(201).json({
      success: true,
      data: newAddress,
      message: 'Thêm địa chỉ thành công',
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const UpdateMyAddress = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    const addressId = parseInt(req.params.id as string);
    const parsedAddress = parseAddressPayload(req.body);

    if (isNaN(addressId)) {
      return res.status(400).json({
        success: false,
        message: 'ID địa chỉ không hợp lệ',
      });
    }

    if (!parsedAddress.data) {
      return res.status(400).json({
        success: false,
        message: parsedAddress.message,
      });
    }

    const updatedAddress = await UpdateAddress(userId, addressId, parsedAddress.data);

    return res.status(200).json({
      success: true,
      data: updatedAddress,
      message: 'Cập nhật địa chỉ thành công',
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const DeleteMyAddress = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    const addressId = parseInt(req.params.id as string);

    if (isNaN(addressId)) {
      return res.status(400).json({
        success: false,
        message: 'ID địa chỉ không hợp lệ',
      });
    }

    await DeleteAddress(userId, addressId);

    return res.status(200).json({
      success: true,
      message: 'Xóa địa chỉ thành công',
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const SetMyDefaultAddress = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    const addressId = parseInt(req.params.id as string);

    if (isNaN(addressId)) {
      return res.status(400).json({
        success: false,
        message: 'ID địa chỉ không hợp lệ',
      });
    }

    const updatedAddress = await SetDefaultAddress(userId, addressId);

    return res.status(200).json({
      success: true,
      data: updatedAddress,
      message: 'Đặt làm địa chỉ mặc định thành công',
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const UpdateMyAvatar = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    const imageFile = req?.file;
    if (!imageFile) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng tải lên một hình ảnh',
      });
    }

    await UpdateUserAvatar(userId, imageFile);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật avatar thành công',
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
