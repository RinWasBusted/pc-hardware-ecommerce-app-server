import type { Request, Response } from 'express';
import { GetUserProfile, UpdateUserProfile, ChangePassword, GetUserAddresses, CreateAddress, UpdateAddress, DeleteAddress, SetDefaultAddress } from './user.service.js';
import { uploadImageToCloudinary } from '../../utils/cloudinary.js';
import { UpdateUserAvatar } from './user.service.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';

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
    const { recipient, phone_number, province, district, ward, street } = req.body;

    if (!recipient || !phone_number || !province || !district || !ward || !street) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin',
      });
    }

    const newAddress = await CreateAddress(userId, {
      recipient,
      phone_number,
      province,
      district,
      ward,
      street,
    });

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
    const { recipient, phone_number, province, district, ward, street } = req.body;

    if (isNaN(addressId)) {
      return res.status(400).json({
        success: false,
        message: 'ID địa chỉ không hợp lệ',
      });
    }

    const updatedAddress = await UpdateAddress(userId, addressId, {
      recipient,
      phone_number,
      province,
      district,
      ward,
      street,
    });

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

    if (!req.file) {
      const updatedUser = await UpdateUserAvatar(userId, null);

      return res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'Xóa avatar thành công',
      });
    }

    const uploadResult = await uploadImageToCloudinary(
      req.file.buffer,
      req.file.originalname,
      'pc-hardware-ecommerce/users/avatars',
    );

    const updatedUser = await UpdateUserAvatar(userId, uploadResult.public_id);

    return res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'Cập nhật avatar thành công',
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
