import { Controller, Get, Query } from "@nestjs/common";
import { ReverseGeocodeQueryDto } from "./dto/reverse-geocode-query.dto";
import { SearchLocationQueryDto } from "./dto/search-location-query.dto";
import { LocationService } from "./location.service";

@Controller("location")
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get("reverse")
  reverseGeocode(@Query() query: ReverseGeocodeQueryDto) {
    return this.locationService.reverseGeocode(query.lat, query.lon);
  }

  @Get("search")
  searchLocation(@Query() query: SearchLocationQueryDto) {
    return this.locationService.searchLocation(query.q);
  }
}
