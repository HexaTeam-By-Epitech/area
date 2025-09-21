import { Injectable } from '@nestjs/common';

let placeholderActionMap = new Map<string, CallableFunction>();
let placeholderUsersArray = new Map<number, Map<string, CallableFunction>>();


// example of map element
placeholderActionMap.set("exampleKey", () => { return "exampleValue"; }); // function will be fetched from actions/serviceName/exampleActionName

// Adding the element in the array for player of id 1 (will be replaced by a unique token in the future)
placeholderUsersArray.set(1, placeholderActionMap);

@Injectable()
export class ManagerService {
    getAction(action: string, user: string): string {
    const func = placeholderUsersArray.get(Number(user))?.get(action);
    if (func) {
        return func();
    }
    return 'Element not found.';
  }
}
