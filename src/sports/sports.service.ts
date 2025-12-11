import { Injectable } from '@nestjs/common';

@Injectable()
export class SportsService {
  getAllSports() {
    return {
      message: 'List of all sports',
      data: [
        { id: 1, name: 'Football', category: 'Team Sport' },
        { id: 2, name: 'Basketball', category: 'Team Sport' },
        { id: 3, name: 'Tennis', category: 'Individual Sport' },
        { id: 4, name: 'Baseball', category: 'Team Sport' },
        { id: 5, name: 'Hockey', category: 'Team Sport' },
      ],
    };
  }

  getSportById(id: string) {
    return {
      message: `Sport details for ID: ${id}`,
      data: { id, name: 'Football', category: 'Team Sport', popularity: 'High' },
    };
  }
}
