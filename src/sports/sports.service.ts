import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface Sport {
  name: string;
  icon: string | null;
  alt: string;
  url: string;
}

@Injectable()
export class SportsService {
  private sportsData: Sport[];

  constructor() {
    this.loadSportsData();
  }

  private loadSportsData() {
    try {
      const dataPath = path.join(__dirname, 'data', 'sports.json');
      const fileContent = fs.readFileSync(dataPath, 'utf-8');
      this.sportsData = JSON.parse(fileContent);
    } catch (error) {
      console.error('Error loading sports data:', error);
      this.sportsData = [];
    }
  }

  getAllSports() {
    return {
      message: 'List of all sports',
      count: this.sportsData.length,
      data: this.sportsData,
    };
  }

  getSportById(id: string) {
    const sport = this.sportsData.find((s) => s.alt === id);

    if (!sport) {
      return {
        message: `Sport not found with ID: ${id}`,
        data: null,
      };
    }

    return {
      message: `Sport details for: ${sport.name}`,
      data: sport,
    };
  }

  getSportByName(name: string) {
    const sport = this.sportsData.find(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );

    if (!sport) {
      return {
        message: `Sport not found with name: ${name}`,
        data: null,
      };
    }

    return {
      message: `Sport details for: ${sport.name}`,
      data: sport,
    };
  }
}
