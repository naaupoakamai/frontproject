import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { buyerGuard } from './core/guards/buyer.guard';
import { sellerGuard } from './core/guards/seller.guard';
import { CustomerComponent } from './pages/customer/customer.component';
import { LoginComponent } from './pages/login/login.component';
import { SellerComponent } from './pages/seller/seller.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'customer/ai-stylist',
    component: CustomerComponent,
    canActivate: [authGuard, buyerGuard],
    data: { view: 'ai' }
  },
  {
    path: 'customer/catalog',
    component: CustomerComponent,
    canActivate: [authGuard, buyerGuard],
    data: { view: 'catalog' }
  },
  {
    path: 'seller/inventory',
    component: SellerComponent,
    canActivate: [authGuard, sellerGuard],
    data: { view: 'list' }
  },
  {
    path: 'seller/create',
    component: SellerComponent,
    canActivate: [authGuard, sellerGuard],
    data: { view: 'create' }
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];
