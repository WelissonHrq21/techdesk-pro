import { Request, Response } from "express";
import { changeOwnPasswordSchema } from "../../schemas/session/changeOwnPasswordSchema";
import { ChangeOwnPasswordService } from "../../services/session/ChangeOwnPasswordService";

class ChangeOwnPasswordController {
  async handle(request: Request, response: Response) {
    const data = changeOwnPasswordSchema.parse(request.body);
    const changeOwnPasswordService = new ChangeOwnPasswordService();

    await changeOwnPasswordService.execute({
      userId: request.user.id,
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });

    return response.status(200).json({
      message: "Password changed successfully",
    });
  }
}

export { ChangeOwnPasswordController };
