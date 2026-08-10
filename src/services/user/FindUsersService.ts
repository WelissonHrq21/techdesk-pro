import { UserRepository } from "../../repositories/UserRepository";

class FindUsersService {
  async execute() {
    const userRepository = new UserRepository();

    return userRepository.findAll();
  }
}

export { FindUsersService };
